import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { tripSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  const orgId = request.headers.get("x-organization-id")!;
  const { searchParams } = request.nextUrl;
  const page = Number(searchParams.get("page") ?? 1);
  const pageSize = Number(searchParams.get("pageSize") ?? 20);
  const status = searchParams.get("status") ?? undefined;
  const driverId = searchParams.get("driverId") ?? undefined;
  const patientId = searchParams.get("patientId") ?? undefined;
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  const where = {
    organizationId: orgId,
    ...(status && { status }),
    ...(driverId && { driverId }),
    ...(patientId && { patientId }),
    ...(dateFrom || dateTo
      ? {
          scheduledAt: {
            ...(dateFrom && { gte: new Date(dateFrom) }),
            ...(dateTo && { lte: new Date(dateTo) }),
          },
        }
      : {}),
  };

  const [trips, total] = await Promise.all([
    prisma.trip.findMany({
      where,
      include: {
        driver: true,
        vehicle: true,
        patient: true,
        clinic: true,
      },
      orderBy: { scheduledAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.trip.count({ where }),
  ]);

  return NextResponse.json({
    data: trips,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

export async function POST(request: NextRequest) {
  try {
    const orgId = request.headers.get("x-organization-id")!;
    const body = await request.json();
    const parsed = tripSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const { distanceKm, costPerKm, ...data } = parsed.data;
    const totalCost =
      distanceKm && costPerKm
        ? distanceKm * costPerKm
        : undefined;

    const trip = await prisma.trip.create({
      data: {
        ...data,
        organizationId: orgId,
        scheduledAt: new Date(data.scheduledAt),
        distanceKm: distanceKm ?? null,
        costPerKm: costPerKm ?? null,
        totalCost: totalCost ?? null,
      },
      include: { driver: true, vehicle: true, patient: true, clinic: true },
    });

    return NextResponse.json({ data: trip }, { status: 201 });
  } catch (error) {
    console.error("Create trip error:", error);
    return NextResponse.json({ error: "Erro ao criar corrida" }, { status: 500 });
  }
}
