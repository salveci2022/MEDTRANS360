import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { comparePassword, createToken, createSession } from "@/lib/auth";
import { loginSchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email },
      include: { organization: true },
    });

    console.log("[LOGIN DEBUG] user found:", !!user, "active:", user?.active, "hasPassword:", !!user?.password);

    if (!user || !user.password) {
      console.log("[LOGIN DEBUG] 401: user not found or no password");
      return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
    }

    if (!user.active) {
      console.log("[LOGIN DEBUG] 401: user inactive, active value:", user.active, typeof user.active);
      return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
    }

    const valid = await comparePassword(password, user.password);
    console.log("[LOGIN DEBUG] password valid:", valid);
    if (!valid) {
      return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
    }

    if (user.twoFactorEnabled) {
      return NextResponse.json({
        requiresTwoFactor: true,
        userId: user.id,
      });
    }

    const sessionUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as import("@/types").Role,
      organizationId: user.organizationId,
      organizationName: user.organization.name,
      organizationSlug: user.organization.slug,
      twoFactorEnabled: user.twoFactorEnabled,
    };

    const token = await createToken(sessionUser);
    await createSession(user.id, token);

    const response = NextResponse.json({ user: sessionUser });
    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
