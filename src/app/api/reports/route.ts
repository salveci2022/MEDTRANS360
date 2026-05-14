import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth, subMonths, eachDayOfInterval, format } from "date-fns";

export async function GET(request: NextRequest) {
  const orgId = request.headers.get("x-organization-id")!;
  const { searchParams } = request.nextUrl;
  const type = searchParams.get("type") ?? "dashboard";
  const dateFrom = searchParams.get("dateFrom")
    ? new Date(searchParams.get("dateFrom")!)
    : startOfMonth(new Date());
  const dateTo = searchParams.get("dateTo")
    ? new Date(searchParams.get("dateTo")!)
    : endOfMonth(new Date());

  if (type === "dashboard") {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      totalTrips,
      tripsToday,
      tripsInProgress,
      totalDrivers,
      activeDrivers,
      totalVehicles,
      activeVehicles,
      totalPatients,
      costMonth,
      distanceMonth,
    ] = await Promise.all([
      prisma.trip.count({ where: { organizationId: orgId } }),
      prisma.trip.count({
        where: { organizationId: orgId, scheduledAt: { gte: today } },
      }),
      prisma.trip.count({
        where: { organizationId: orgId, status: "IN_PROGRESS" },
      }),
      prisma.driver.count({ where: { organizationId: orgId } }),
      prisma.driver.count({ where: { organizationId: orgId, status: "ACTIVE" } }),
      prisma.vehicle.count({ where: { organizationId: orgId } }),
      prisma.vehicle.count({ where: { organizationId: orgId, status: "ACTIVE" } }),
      prisma.patient.count({ where: { organizationId: orgId, active: true } }),
      prisma.trip.aggregate({
        where: {
          organizationId: orgId,
          status: "COMPLETED",
          completedAt: { gte: monthStart, lte: monthEnd },
        },
        _sum: { totalCost: true },
      }),
      prisma.trip.aggregate({
        where: {
          organizationId: orgId,
          status: "COMPLETED",
          completedAt: { gte: monthStart, lte: monthEnd },
        },
        _sum: { distanceKm: true },
      }),
    ]);

    const days = eachDayOfInterval({ start: subMonths(now, 1), end: now });
    const tripsTrend = await Promise.all(
      days.map(async (day) => {
        const nextDay = new Date(day);
        nextDay.setDate(nextDay.getDate() + 1);
        const [count, cost] = await Promise.all([
          prisma.trip.count({
            where: {
              organizationId: orgId,
              scheduledAt: { gte: day, lt: nextDay },
            },
          }),
          prisma.trip.aggregate({
            where: {
              organizationId: orgId,
              status: "COMPLETED",
              completedAt: { gte: day, lt: nextDay },
            },
            _sum: { totalCost: true },
          }),
        ]);
        return { date: format(day, "yyyy-MM-dd"), count, cost: cost._sum.totalCost ?? 0 };
      })
    );

    return NextResponse.json({
      totalTrips,
      tripsToday,
      tripsInProgress,
      totalDrivers,
      activeDrivers,
      totalVehicles,
      activeVehicles,
      totalPatients,
      totalCostMonth: costMonth._sum.totalCost ?? 0,
      totalDistanceMonth: distanceMonth._sum.distanceKm ?? 0,
      tripsTrend,
    });
  }

  if (type === "trips") {
    const trips = await prisma.trip.findMany({
      where: {
        organizationId: orgId,
        scheduledAt: { gte: dateFrom, lte: dateTo },
      },
      include: { driver: true, vehicle: true, patient: true, clinic: true },
      orderBy: { scheduledAt: "desc" },
    });

    const summary = await prisma.trip.aggregate({
      where: {
        organizationId: orgId,
        status: "COMPLETED",
        completedAt: { gte: dateFrom, lte: dateTo },
      },
      _sum: { totalCost: true, distanceKm: true },
      _count: true,
    });

    return NextResponse.json({ data: trips, summary });
  }

  if (type === "fuel") {
    const records = await prisma.fuelRecord.findMany({
      where: { organizationId: orgId, date: { gte: dateFrom, lte: dateTo } },
      include: { vehicle: true },
      orderBy: { date: "desc" },
    });

    const summary = await prisma.fuelRecord.aggregate({
      where: { organizationId: orgId, date: { gte: dateFrom, lte: dateTo } },
      _sum: { totalCost: true, liters: true },
      _avg: { pricePerLiter: true },
    });

    return NextResponse.json({ data: records, summary });
  }

  return NextResponse.json({ error: "Tipo de relatório inválido" }, { status: 400 });
}
