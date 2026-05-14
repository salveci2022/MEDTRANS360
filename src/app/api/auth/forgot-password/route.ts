import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPasswordReset } from "@/lib/email";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email) return NextResponse.json({ error: "Email obrigatório" }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { email } });

    // Always return 200 to avoid user enumeration
    if (!user || !user.active) {
      return NextResponse.json({ message: "Se o email existir, você receberá o link em breve." });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.passwordResetToken.create({ data: { email, token, expiresAt } });
    await sendPasswordReset(email, token);

    return NextResponse.json({ message: "Se o email existir, você receberá o link em breve." });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
