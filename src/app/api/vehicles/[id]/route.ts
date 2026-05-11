import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { vehicleSchema } from "@/lib/validations";

type Params = { params: { id: string } };

export async function GET(_: NextRequest, { params }: Params) {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: params.id },
    include: {
      driver: true,
      fuelRecords: { orderBy: { date: "desc" }, take: 10 },
      trips: { orderBy: { scheduledAt: "desc" }, take: 10, include: { driver: true, patient: true } },
    },
  });
  if (!vehicle) return NextResponse.json({ error: "Veículo não encontrado" }, { status: 404 });
  return NextResponse.json({ data: vehicle });
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const orgId = request.headers.get("x-organization-id")!;
    const body = await request.json();
    const parsed = vehicleSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const vehicle = await prisma.vehicle.findUnique({ where: { id: params.id } });
    if (!vehicle || vehicle.organizationId !== orgId) {
      return NextResponse.json({ error: "Veículo não encontrado" }, { status: 404 });
    }

    const updated = await prisma.vehicle.update({
      where: { id: params.id },
      data: parsed.data,
      include: { driver: true },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("Update vehicle error:", error);
    return NextResponse.json({ error: "Erro ao atualizar veículo" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const orgId = request.headers.get("x-organization-id")!;
  const vehicle = await prisma.vehicle.findUnique({ where: { id: params.id } });
  if (!vehicle || vehicle.organizationId !== orgId) {
    return NextResponse.json({ error: "Veículo não encontrado" }, { status: 404 });
  }
  await prisma.vehicle.update({
    where: { id: params.id },
    data: { status: "INACTIVE" },
  });
  return NextResponse.json({ message: "Veículo desativado" });
}
