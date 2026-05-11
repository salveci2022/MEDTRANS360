import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/register", "/magic-link", "/verify-2fa", "/forgot-password", "/reset-password"];
const API_PUBLIC_PATHS = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/magic-link",
  "/api/auth/2fa/verify",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname === "/"
  ) {
    return NextResponse.next();
  }

  if (API_PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = request.cookies.get("auth-token")?.value;

  if (pathname.startsWith("/api/")) {
    if (!token) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: "Token inválido ou expirado" }, { status: 401 });
    }
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-id", user.id);
    requestHeaders.set("x-user-email", user.email);
    requestHeaders.set("x-user-role", user.role);
    requestHeaders.set("x-organization-id", user.organizationId);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (!token) {
    if (!isPublic) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  const user = await verifyToken(token);
  if (!user) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("auth-token");
    return response;
  }

  if (isPublic) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
