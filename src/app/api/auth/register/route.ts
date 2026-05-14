import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, createToken, createSession } from "@/lib/auth";
import { registerSchema } from "@/lib/validations";
import { slugify } from "@/lib/utils";
import { sendWelcomeEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const { name, email, password, organizationName, organizationCnpj } = parsed.data;

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return NextResponse.json({ error: "Este email já está em uso" }, { status: 409 });
    }

    const baseSlug = slugify(organizationName);
    let slug = baseSlug;
    let counter = 1;
    while (await prisma.organization.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter++}`;
    }

    const hashedPassword = await hashPassword(password);

    const result = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: organizationName,
          slug,
          cnpj: organizationCnpj,
          plan: "FREE",
          maxUsers: 5,
          maxVehicles: 10,
        },
      });

      const user = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: "ADMIN",
          organizationId: org.id,
          emailVerified: new Date(),
        },
      });

      await tx.subscription.create({
        data: {
          organizationId: org.id,
          plan: "FREE",
          status: "TRIAL",
          startDate: new Date(),
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        },
      });

      return { org, user };
    });

    const sessionUser = {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      role: result.user.role as import("@/types").Role,
      organizationId: result.org.id,
      organizationName: result.org.name,
      organizationSlug: result.org.slug,
      twoFactorEnabled: false,
    };

    const token = await createToken(sessionUser);
    await createSession(result.user.id, token);

    sendWelcomeEmail(email, name, organizationName).catch(console.error);

    const response = NextResponse.json({ user: sessionUser }, { status: 201 });
    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
