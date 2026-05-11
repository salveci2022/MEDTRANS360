import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: { id: string } };

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const orgId = request.headers.get("x-organization-id")!;
    const role = request.headers.get("x-user-role")!;
    const requesterId = request.headers.get("x-user-id")!;

    if (!["SUPER_ADMIN", "ADMIN"].includes(role)) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const { name, userRole, active } = await request.json();

    const target = await prisma.user.findUnique({ where: { id: params.id } });
    if (!target || target.organizationId !== orgId) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    if (target.id === requesterId && active === false) {
      return NextResponse.json({ error: "Você não pode desativar sua própria conta" }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(userRole !== undefined && { role: userRole }),
        ...(active !== undefined && { active }),
      },
      select: { id: true, name: true, email: true, role: true, active: true },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json({ error: "Erro ao atualizar usuário" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const orgId = request.headers.get("x-organization-id")!;
  const role = request.headers.get("x-user-role")!;
  const requesterId = request.headers.get("x-user-id")!;

  if (!["SUPER_ADMIN", "ADMIN"].includes(role)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  if (params.id === requesterId) {
    return NextResponse.json({ error: "Você não pode excluir sua própria conta" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id: params.id } });
  if (!target || target.organizationId !== orgId) {
    return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  }

  await prisma.user.update({ where: { id: params.id }, data: { active: false } });
  return NextResponse.json({ message: "Usuário desativado" });
}
