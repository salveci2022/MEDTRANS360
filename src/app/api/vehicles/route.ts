import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { vehicleSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  const orgId = request.headers.get("x-organization-id")!;
  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status") ?? undefined;
  const search = searchParams.get("search") ?? undefined;

  const vehicles = await prisma.vehicle.findMany({
    where: {
      organizationId: orgId,
      ...(status && { status }),
      ...(search && {
        OR: [
          { plate: { contains: search, mode: "insensitive" } },
          { model: { contains: search, mode: "insensitive" } },
          { brand: { contains: search, mode: "insensitive" } },
        ],
      }),
    },
    include: { driver: true },
    orderBy: { plate: "asc" },
  });

  return NextResponse.json({ data: vehicles });
}

export async function POST(request: NextRequest) {
  try {
    const orgId = request.headers.get("x-organization-id")!;
    const body = await request.json();
    const parsed = vehicleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const vehicle = await prisma.vehicle.create({
      data: { ...parsed.data, organizationId: orgId },
      include: { driver: true },
    });

    return NextResponse.json({ data: vehicle }, { status: 201 });
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Placa já cadastrada nesta organização" }, { status: 409 });
    }
    console.error("Create vehicle error:", error);
    return NextResponse.json({ error: "Erro ao cadastrar veículo" }, { status: 500 });
  }
}
