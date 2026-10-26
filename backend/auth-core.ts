import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomBytes } from "node:crypto";
import { prisma } from "./prisma";
import { ApiError } from "./http";

export const COOKIE = "hcm_token";
export type Role = "ADMIN" | "HR" | "EMPLOYEE";
export type AuthUser = { id: string; email: string; name: string; role: Role; employeeId: string | null; mustChangePassword: boolean };

const secret = () => {
  const value = process.env.JWT_SECRET;
  if (!value) throw new ApiError(500, "JWT_SECRET is not set");
  return value;
};

export async function hashPassword(password: string) { return bcrypt.hash(password, 10); }
export async function verifyPassword(password: string, hash: string) { return bcrypt.compare(password, hash); }
export function randomPassword() { return `${randomBytes(12).toString("base64url")}A1`; }
export function signToken(user: AuthUser) { return jwt.sign(user, secret(), { expiresIn: "7d" }); }

export function verifyToken(token?: string): AuthUser | null {
  if (!token) return null;
  try { return jwt.verify(token, secret()) as AuthUser; }
  catch { return null; }
}

export async function hydrateUser(id: string): Promise<AuthUser | null> {
  const user = await prisma.user.findUnique({ where: { id }, include: { employee: true } });
  if (!user || !user.active) return null;
  return { id: user.id, email: user.email, name: user.name, role: user.role as Role, employeeId: user.employee?.id ?? null, mustChangePassword: user.mustChangePassword };
}

export function ownEmployeeId(user: AuthUser) {
  if (user.role !== "EMPLOYEE") return null;
  if (!user.employeeId) throw new ApiError(403, "Employee profile is missing");
  return user.employeeId;
}
