import { NextRequest, NextResponse } from "next/server";
import { authenticator } from "otplib";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    const secret = authenticator.generateSecret();
    const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "TransportSaaS";
    const otpauth = authenticator.keyuri(user.email, appName, secret);
    const qrCode = await QRCode.toDataURL(otpauth);

    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret },
    });

    return NextResponse.json({ secret, qrCode });
  } catch (error) {
    console.error("2FA setup error:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { code } = await request.json();
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user?.twoFactorSecret) {
      return NextResponse.json({ error: "Configure o 2FA primeiro" }, { status: 400 });
    }

    const valid = authenticator.verify({ token: code, secret: user.twoFactorSecret });
    if (!valid) {
      return NextResponse.json({ error: "Código inválido" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true },
    });

    return NextResponse.json({ message: "2FA ativado com sucesso" });
  } catch (error) {
    console.error("2FA enable error:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
