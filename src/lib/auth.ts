import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import type { SessionUser, Role } from "@/types";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "fallback-secret-change-in-production"
);

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createToken(payload: SessionUser): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

export async function getUserFromToken(token: string): Promise<SessionUser | null> {
  const payload = await verifyToken(token);
  if (!payload) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.id, active: true },
    include: { organization: true },
  });

  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as Role,
    organizationId: user.organizationId,
    organizationName: user.organization.name,
    organizationSlug: user.organization.slug,
    twoFactorEnabled: user.twoFactorEnabled,
  };
}

export async function createSession(userId: string, token: string): Promise<void> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.session.create({
    data: { userId, token, expiresAt },
  });
}

export async function deleteSession(token: string): Promise<void> {
  await prisma.session.deleteMany({ where: { token } });
}

export async function isSessionValid(token: string): Promise<boolean> {
  const session = await prisma.session.findUnique({
    where: { token },
  });
  if (!session) return false;
  return session.expiresAt > new Date();
}

export function canAccess(userRole: string, requiredRoles: string[]): boolean {
  const hierarchy: Record<string, number> = {
    SUPER_ADMIN: 5,
    ADMIN: 4,
    MANAGER: 3,
    OPERATOR: 2,
    DRIVER: 1,
  };
  const userLevel = hierarchy[userRole] ?? 0;
  return requiredRoles.some((role) => userLevel >= (hierarchy[role] ?? 0));
}
