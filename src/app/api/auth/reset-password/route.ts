import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();
    if (!token || !password || password.length < 8) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const record = await prisma.passwordResetToken.findUnique({ where: { token } });
    if (!record || record.used || record.expiresAt < new Date()) {
      return NextResponse.json({ error: "Link inválido ou expirado" }, { status: 400 });
    }

    const hashed = await hashPassword(password);

    await prisma.$transaction([
      prisma.user.update({
        where: { email: record.email },
        data: { password: hashed },
      }),
      prisma.passwordResetToken.update({
        where: { token },
        data: { used: true },
      }),
    ]);

    return NextResponse.json({ message: "Senha redefinida com sucesso" });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
