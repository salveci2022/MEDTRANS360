import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { sendInviteEmail } from "@/lib/email";
import crypto from "crypto";

export async function GET(request: NextRequest) {
  const orgId = request.headers.get("x-organization-id")!;
  const role = request.headers.get("x-user-role")!;

  if (!["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(role)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    where: { organizationId: orgId },
    select: {
      id: true, name: true, email: true, role: true,
      active: true, createdAt: true, twoFactorEnabled: true,
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ data: users });
}

export async function POST(request: NextRequest) {
  try {
    const orgId = request.headers.get("x-organization-id")!;
    const inviterName = request.headers.get("x-user-email")!;
    const role = request.headers.get("x-user-role")!;

    if (!["SUPER_ADMIN", "ADMIN"].includes(role)) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const { name, email, userRole } = await request.json();
    if (!name || !email) {
      return NextResponse.json({ error: "Nome e email obrigatórios" }, { status: 400 });
    }

    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) return NextResponse.json({ error: "Organização não encontrada" }, { status: 404 });

    const userCount = await prisma.user.count({ where: { organizationId: orgId, active: true } });
    if (org.maxUsers !== -1 && userCount >= org.maxUsers) {
      return NextResponse.json({ error: "Limite de usuários do plano atingido" }, { status: 403 });
    }

    const tempPassword = crypto.randomBytes(6).toString("hex");
    const hashed = await hashPassword(tempPassword);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        role: userRole ?? "OPERATOR",
        organizationId: orgId,
      },
    });

    await sendInviteEmail(email, inviterName, org.name, tempPassword);

    return NextResponse.json({
      data: { id: user.id, name: user.name, email: user.email, role: user.role },
      tempPassword,
    }, { status: 201 });
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Email já cadastrado" }, { status: 409 });
    }
    console.error("Invite user error:", error);
    return NextResponse.json({ error: "Erro ao convidar usuário" }, { status: 500 });
  }
}
