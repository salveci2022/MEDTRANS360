import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createToken, createSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");
    if (!token) {
      return NextResponse.json({ error: "Token não fornecido" }, { status: 400 });
    }

    const magicLink = await prisma.magicLink.findUnique({
      where: { token },
      include: { user: { include: { organization: true } } },
    });

    if (!magicLink || magicLink.used || magicLink.expiresAt < new Date()) {
      return NextResponse.json({ error: "Link inválido ou expirado" }, { status: 400 });
    }

    await prisma.magicLink.update({
      where: { id: magicLink.id },
      data: { used: true },
    });

    if (!magicLink.user.active) {
      return NextResponse.json({ error: "Usuário inativo" }, { status: 403 });
    }

    const user = magicLink.user;
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

    const authToken = await createToken(sessionUser);
    await createSession(user.id, authToken);

    const response = NextResponse.json({ user: sessionUser });
    response.cookies.set("auth-token", authToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Magic link verify error:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
