import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fuelRecordSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  const orgId = request.headers.get("x-organization-id")!;
  const { searchParams } = request.nextUrl;
  const vehicleId = searchParams.get("vehicleId") ?? undefined;
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const page = Number(searchParams.get("page") ?? 1);
  const pageSize = Number(searchParams.get("pageSize") ?? 20);

  const where = {
    organizationId: orgId,
    ...(vehicleId && { vehicleId }),
    ...(dateFrom || dateTo
      ? {
          date: {
            ...(dateFrom && { gte: new Date(dateFrom) }),
            ...(dateTo && { lte: new Date(dateTo) }),
          },
        }
      : {}),
  };

  const [records, total] = await Promise.all([
    prisma.fuelRecord.findMany({
      where,
      include: { vehicle: true },
      orderBy: { date: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.fuelRecord.count({ where }),
  ]);

  const aggregates = await prisma.fuelRecord.aggregate({
    where,
    _sum: { totalCost: true, liters: true },
    _avg: { pricePerLiter: true },
  });

  return NextResponse.json({
    data: records,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    summary: {
      totalCost: aggregates._sum.totalCost ?? 0,
      totalLiters: aggregates._sum.liters ?? 0,
      avgPricePerLiter: aggregates._avg.pricePerLiter ?? 0,
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const orgId = request.headers.get("x-organization-id")!;
    const body = await request.json();
    const parsed = fuelRecordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const { liters, pricePerLiter, ...data } = parsed.data;
    const totalCost = liters * pricePerLiter;

    const record = await prisma.fuelRecord.create({
      data: {
        ...data,
        liters,
        pricePerLiter,
        totalCost,
        organizationId: orgId,
        date: new Date(parsed.data.date),
      },
      include: { vehicle: true },
    });

    await prisma.vehicle.update({
      where: { id: parsed.data.vehicleId },
      data: { currentMileage: parsed.data.mileageAtFuel },
    });

    return NextResponse.json({ data: record }, { status: 201 });
  } catch (error) {
    console.error("Create fuel record error:", error);
    return NextResponse.json({ error: "Erro ao registrar abastecimento" }, { status: 500 });
  }
}
