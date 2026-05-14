import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { driverSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  const orgId = request.headers.get("x-organization-id")!;
  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status") ?? undefined;
  const search = searchParams.get("search") ?? undefined;

  const drivers = await prisma.driver.findMany({
    where: {
      organizationId: orgId,
      ...(status && { status }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { cpf: { contains: search } },
        ],
      }),
    },
    include: { vehicle: true, user: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ data: drivers });
}

export async function POST(request: NextRequest) {
  try {
    const orgId = request.headers.get("x-organization-id")!;
    const body = await request.json();
    const parsed = driverSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const driver = await prisma.driver.create({
      data: {
        ...parsed.data,
        organizationId: orgId,
        licenseExpiry: new Date(parsed.data.licenseExpiry),
      },
      include: { vehicle: true },
    });

    return NextResponse.json({ data: driver }, { status: 201 });
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "CPF já cadastrado nesta organização" }, { status: 409 });
    }
    console.error("Create driver error:", error);
    return NextResponse.json({ error: "Erro ao cadastrar motorista" }, { status: 500 });
  }
}
