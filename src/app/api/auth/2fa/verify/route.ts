import { NextRequest, NextResponse } from "next/server";
import { authenticator } from "otplib";
import { prisma } from "@/lib/prisma";
import { createToken, createSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { userId, code } = await request.json();

    if (!userId || !code) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId, active: true },
      include: { organization: true },
    });

    if (!user || !user.twoFactorSecret) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    const valid = authenticator.verify({ token: code, secret: user.twoFactorSecret });
    if (!valid) {
      return NextResponse.json({ error: "Código inválido" }, { status: 400 });
    }

    const sessionUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as import("@/types").Role,
      organizationId: user.organizationId,
      organizationName: user.organization.name,
      organizationSlug: user.organization.slug,
      twoFactorEnabled: true,
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
    console.error("2FA verify error:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
