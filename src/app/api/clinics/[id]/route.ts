import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clinicSchema } from "@/lib/validations";

type Params = { params: { id: string } };

export async function GET(_: NextRequest, { params }: Params) {
  const clinic = await prisma.clinic.findUnique({
    where: { id: params.id },
    include: { patients: true, _count: { select: { trips: true } } },
  });
  if (!clinic) return NextResponse.json({ error: "Clínica não encontrada" }, { status: 404 });
  return NextResponse.json({ data: clinic });
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const orgId = request.headers.get("x-organization-id")!;
    const body = await request.json();
    const parsed = clinicSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const clinic = await prisma.clinic.findUnique({ where: { id: params.id } });
    if (!clinic || clinic.organizationId !== orgId) {
      return NextResponse.json({ error: "Clínica não encontrada" }, { status: 404 });
    }

    const updated = await prisma.clinic.update({
      where: { id: params.id },
      data: parsed.data,
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("Update clinic error:", error);
    return NextResponse.json({ error: "Erro ao atualizar clínica" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const orgId = request.headers.get("x-organization-id")!;
  const clinic = await prisma.clinic.findUnique({ where: { id: params.id } });
  if (!clinic || clinic.organizationId !== orgId) {
    return NextResponse.json({ error: "Clínica não encontrada" }, { status: 404 });
  }
  await prisma.clinic.update({ where: { id: params.id }, data: { active: false } });
  return NextResponse.json({ message: "Clínica desativada" });
}
