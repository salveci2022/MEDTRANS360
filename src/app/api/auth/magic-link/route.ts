import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendMagicLink } from "@/lib/email";
import { generateToken } from "@/lib/utils";
import { magicLinkSchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = magicLinkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Email inválido" }, { status: 400 });
    }

    const { email } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email, active: true },
    });

    // Always return success to avoid user enumeration
    if (!user) {
      return NextResponse.json({ message: "Se o email existir, você receberá o link em breve" });
    }

    const token = generateToken(48);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    await prisma.magicLink.create({
      data: { userId: user.id, email, token, expiresAt },
    });

    await sendMagicLink(email, token);

    return NextResponse.json({ message: "Se o email existir, você receberá o link em breve" });
  } catch (error) {
    console.error("Magic link error:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
