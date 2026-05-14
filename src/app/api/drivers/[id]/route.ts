import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { driverSchema } from "@/lib/validations";

type Params = { params: { id: string } };

export async function GET(_: NextRequest, { params }: Params) {
  const driver = await prisma.driver.findUnique({
    where: { id: params.id },
    include: {
      vehicle: true,
      user: true,
      trips: {
        orderBy: { scheduledAt: "desc" },
        take: 10,
        include: { patient: true, vehicle: true },
      },
    },
  });
  if (!driver) return NextResponse.json({ error: "Motorista não encontrado" }, { status: 404 });
  return NextResponse.json({ data: driver });
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const orgId = request.headers.get("x-organization-id")!;
    const body = await request.json();
    const parsed = driverSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const driver = await prisma.driver.findUnique({ where: { id: params.id } });
    if (!driver || driver.organizationId !== orgId) {
      return NextResponse.json({ error: "Motorista não encontrado" }, { status: 404 });
    }

    const updated = await prisma.driver.update({
      where: { id: params.id },
      data: {
        ...parsed.data,
        ...(parsed.data.licenseExpiry && { licenseExpiry: new Date(parsed.data.licenseExpiry) }),
      },
      include: { vehicle: true },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("Update driver error:", error);
    return NextResponse.json({ error: "Erro ao atualizar motorista" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const orgId = request.headers.get("x-organization-id")!;
  const driver = await prisma.driver.findUnique({ where: { id: params.id } });
  if (!driver || driver.organizationId !== orgId) {
    return NextResponse.json({ error: "Motorista não encontrado" }, { status: 404 });
  }
  await prisma.driver.update({
    where: { id: params.id },
    data: { status: "INACTIVE" },
  });
  return NextResponse.json({ message: "Motorista desativado" });
}
