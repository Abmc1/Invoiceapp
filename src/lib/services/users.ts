import "server-only";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword, verifyPassword, isPasswordStrongEnough } from "@/lib/auth/password";
import { recordAuditLog } from "./audit";

export type UserRole = "ADMIN" | "USER";

export async function listUsers() {
  return db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role, active: users.active, createdAt: users.createdAt })
    .from(users)
    .orderBy(desc(users.createdAt));
}

export async function createUser(
  input: { name: string; email: string; password: string; role: UserRole },
  createdByUserId: string
) {
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(${users.email}) = ${input.email.toLowerCase()}`)
    .limit(1);
  if (existing.length > 0) {
    throw new Error("A user with this email already exists.");
  }

  const passwordHash = await hashPassword(input.password);
  const [user] = await db
    .insert(users)
    .values({ name: input.name, email: input.email.toLowerCase(), passwordHash, role: input.role })
    .returning({ id: users.id, name: users.name, email: users.email, role: users.role });

  await recordAuditLog(db, {
    userId: createdByUserId,
    entityType: "user",
    entityId: user.id,
    action: "CREATED",
    newValues: { email: user.email, role: user.role },
  });

  return user;
}

export async function setUserActive(userId: string, active: boolean, actingUserId: string) {
  const [updated] = await db.update(users).set({ active, updatedAt: new Date() }).where(eq(users.id, userId)).returning();

  await recordAuditLog(db, {
    userId: actingUserId,
    entityType: "user",
    entityId: userId,
    action: active ? "REACTIVATED" : "DEACTIVATED",
  });

  return updated;
}

/**
 * Lets a logged-in user change their own password, after verifying their
 * current one. This is intentionally separate from `createUser` (which sets
 * a temporary password for a new account) — it's the only path by which an
 * existing password hash is ever replaced.
 */
export async function changeOwnPassword(userId: string, currentPassword: string, newPassword: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new Error("User not found.");

  const currentValid = await verifyPassword(currentPassword, user.passwordHash);
  if (!currentValid) {
    throw new Error("Current password is incorrect.");
  }

  if (!isPasswordStrongEnough(newPassword)) {
    throw new Error("New password must be at least 8 characters and include a letter and a number.");
  }

  const passwordHash = await hashPassword(newPassword);
  await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, userId));

  await recordAuditLog(db, {
    userId,
    entityType: "user",
    entityId: userId,
    action: "PASSWORD_CHANGED",
  });
}

export async function setUserRole(userId: string, role: UserRole, actingUserId: string) {
  const [updated] = await db.update(users).set({ role, updatedAt: new Date() }).where(eq(users.id, userId)).returning();

  await recordAuditLog(db, {
    userId: actingUserId,
    entityType: "user",
    entityId: userId,
    action: "ROLE_CHANGED",
    newValues: { role },
  });

  return updated;
}
