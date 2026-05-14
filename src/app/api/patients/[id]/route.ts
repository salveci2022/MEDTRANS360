import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { patientSchema } from "@/lib/validations";

type Params = { params: { id: string } };

export async function GET(_: NextRequest, { params }: Params) {
  const patient = await prisma.patient.findUnique({
    where: { id: params.id },
    include: {
      clinic: true,
      trips: { orderBy: { scheduledAt: "desc" }, take: 10, include: { driver: true, vehicle: true } },
    },
  });
  if (!patient) return NextResponse.json({ error: "Paciente não encontrado" }, { status: 404 });
  return NextResponse.json({ data: patient });
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const orgId = request.headers.get("x-organization-id")!;
    const body = await request.json();
    const parsed = patientSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const patient = await prisma.patient.findUnique({ where: { id: params.id } });
    if (!patient || patient.organizationId !== orgId) {
      return NextResponse.json({ error: "Paciente não encontrado" }, { status: 404 });
    }

    const updated = await prisma.patient.update({
      where: { id: params.id },
      data: {
        ...parsed.data,
        ...(parsed.data.birthDate && { birthDate: new Date(parsed.data.birthDate) }),
      },
      include: { clinic: true },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("Update patient error:", error);
    return NextResponse.json({ error: "Erro ao atualizar paciente" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const orgId = request.headers.get("x-organization-id")!;
  const patient = await prisma.patient.findUnique({ where: { id: params.id } });
  if (!patient || patient.organizationId !== orgId) {
    return NextResponse.json({ error: "Paciente não encontrado" }, { status: 404 });
  }
  await prisma.patient.update({ where: { id: params.id }, data: { active: false } });
  return NextResponse.json({ message: "Paciente desativado" });
}
