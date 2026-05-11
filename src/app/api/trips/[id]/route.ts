import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { tripSchema } from "@/lib/validations";

type Params = { params: { id: string } };

export async function GET(_: NextRequest, { params }: Params) {
  const trip = await prisma.trip.findUnique({
    where: { id: params.id },
    include: { driver: true, vehicle: true, patient: true, clinic: true, gpsLogs: true },
  });
  if (!trip) return NextResponse.json({ error: "Corrida não encontrada" }, { status: 404 });
  return NextResponse.json({ data: trip });
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const orgId = request.headers.get("x-organization-id")!;
    const body = await request.json();

    const trip = await prisma.trip.findUnique({ where: { id: params.id } });
    if (!trip || trip.organizationId !== orgId) {
      return NextResponse.json({ error: "Corrida não encontrada" }, { status: 404 });
    }

    const parsed = tripSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const { distanceKm, costPerKm, ...data } = parsed.data;
    const totalCost = distanceKm && costPerKm ? distanceKm * costPerKm : undefined;

    const updated = await prisma.trip.update({
      where: { id: params.id },
      data: {
        ...data,
        ...(data.scheduledAt && { scheduledAt: new Date(data.scheduledAt) }),
        ...(distanceKm !== undefined && { distanceKm }),
        ...(costPerKm !== undefined && { costPerKm }),
        ...(totalCost !== undefined && { totalCost }),
      },
      include: { driver: true, vehicle: true, patient: true, clinic: true },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("Update trip error:", error);
    return NextResponse.json({ error: "Erro ao atualizar corrida" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const orgId = request.headers.get("x-organization-id")!;
    const { status, startedAt, completedAt, mileageEnd } = await request.json();

    const trip = await prisma.trip.findUnique({ where: { id: params.id } });
    if (!trip || trip.organizationId !== orgId) {
      return NextResponse.json({ error: "Corrida não encontrada" }, { status: 404 });
    }

    const updated = await prisma.trip.update({
      where: { id: params.id },
      data: {
        ...(status && { status }),
        ...(startedAt && { startedAt: new Date(startedAt) }),
        ...(completedAt && { completedAt: new Date(completedAt) }),
        ...(mileageEnd && { mileageEnd }),
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("Patch trip error:", error);
    return NextResponse.json({ error: "Erro ao atualizar status" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const orgId = request.headers.get("x-organization-id")!;
  const trip = await prisma.trip.findUnique({ where: { id: params.id } });
  if (!trip || trip.organizationId !== orgId) {
    return NextResponse.json({ error: "Corrida não encontrada" }, { status: 404 });
  }
  if (trip.status === "IN_PROGRESS") {
    return NextResponse.json({ error: "Não é possível excluir corrida em andamento" }, { status: 400 });
  }
  await prisma.trip.delete({ where: { id: params.id } });
  return NextResponse.json({ message: "Corrida excluída" });
}
