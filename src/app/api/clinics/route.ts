import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clinicSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  const orgId = request.headers.get("x-organization-id")!;
  const { searchParams } = request.nextUrl;
  const search = searchParams.get("search") ?? undefined;

  const clinics = await prisma.clinic.findMany({
    where: {
      organizationId: orgId,
      active: true,
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { address: { contains: search, mode: "insensitive" } },
        ],
      }),
    },
    include: { _count: { select: { patients: true, trips: true } } },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ data: clinics });
}

export async function POST(request: NextRequest) {
  try {
    const orgId = request.headers.get("x-organization-id")!;
    const body = await request.json();
    const parsed = clinicSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const clinic = await prisma.clinic.create({
      data: { ...parsed.data, organizationId: orgId },
    });

    return NextResponse.json({ data: clinic }, { status: 201 });
  } catch (error) {
    console.error("Create clinic error:", error);
    return NextResponse.json({ error: "Erro ao cadastrar clínica" }, { status: 500 });
  }
}
