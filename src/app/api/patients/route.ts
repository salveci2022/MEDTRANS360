import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { patientSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  const orgId = request.headers.get("x-organization-id")!;
  const { searchParams } = request.nextUrl;
  const search = searchParams.get("search") ?? undefined;
  const clinicId = searchParams.get("clinicId") ?? undefined;

  const patients = await prisma.patient.findMany({
    where: {
      organizationId: orgId,
      active: true,
      ...(clinicId && { clinicId }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { cpf: { contains: search } },
          { phone: { contains: search } },
        ],
      }),
    },
    include: { clinic: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ data: patients });
}

export async function POST(request: NextRequest) {
  try {
    const orgId = request.headers.get("x-organization-id")!;
    const body = await request.json();
    const parsed = patientSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const patient = await prisma.patient.create({
      data: {
        ...parsed.data,
        organizationId: orgId,
        ...(parsed.data.birthDate && { birthDate: new Date(parsed.data.birthDate) }),
      },
      include: { clinic: true },
    });

    return NextResponse.json({ data: patient }, { status: 201 });
  } catch (error) {
    console.error("Create patient error:", error);
    return NextResponse.json({ error: "Erro ao cadastrar paciente" }, { status: 500 });
  }
}
