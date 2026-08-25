import "server-only";
import crypto from "node:crypto";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { loginOtpCodes } from "@/db/schema";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_VERIFY_ATTEMPTS = 5;

/** Cryptographically random 6-digit code, zero-padded (e.g. "042817"). */
function generateCode(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

/**
 * Issues a new email login code for a user, invalidating any previous
 * unconsumed codes first (so only the most recently sent code ever works —
 * otherwise an old, still-valid code sitting in someone's inbox would stay
 * usable after they request a fresh one).
 */
export async function createLoginOtp(userId: string): Promise<string> {
  const code = generateCode();
  const codeHash = await hashPassword(code);

  await db.transaction(async (tx) => {
    await tx
      .update(loginOtpCodes)
      .set({ consumedAt: new Date() })
      .where(and(eq(loginOtpCodes.userId, userId), isNull(loginOtpCodes.consumedAt)));

    await tx.insert(loginOtpCodes).values({
      userId,
      codeHash,
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    });
  });

  return code;
}

export type VerifyOtpResult =
  | { ok: true }
  | { ok: false; reason: "no_code" | "expired" | "too_many_attempts" | "wrong_code" };

/**
 * Verifies a submitted code against the most recent unconsumed code issued
 * for this user. Single-use (marks consumed on success) and capped at
 * MAX_VERIFY_ATTEMPTS wrong guesses per issued code — a 6-digit code only
 * has a million possibilities, so without a hard cap it would be brute-
 * forceable well within its 10-minute lifetime.
 */
export async function verifyLoginOtp(userId: string, submittedCode: string): Promise<VerifyOtpResult> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(loginOtpCodes)
      .where(and(eq(loginOtpCodes.userId, userId), isNull(loginOtpCodes.consumedAt)))
      .orderBy(desc(loginOtpCodes.createdAt))
      .limit(1);

    if (!row) return { ok: false, reason: "no_code" };
    if (row.expiresAt.getTime() < Date.now()) return { ok: false, reason: "expired" };
    if (row.attempts >= MAX_VERIFY_ATTEMPTS) return { ok: false, reason: "too_many_attempts" };

    const valid = await verifyPassword(submittedCode, row.codeHash);

    if (!valid) {
      await tx.update(loginOtpCodes).set({ attempts: row.attempts + 1 }).where(eq(loginOtpCodes.id, row.id));
      return { ok: false, reason: "wrong_code" };
    }

    await tx.update(loginOtpCodes).set({ consumedAt: new Date() }).where(eq(loginOtpCodes.id, row.id));
    return { ok: true };
  });
}

/** Removes expired/consumed codes older than a day — call opportunistically, not security-critical. */
export async function pruneOldLoginOtps(): Promise<void> {
  await db.delete(loginOtpCodes).where(sql`${loginOtpCodes.createdAt} < now() - interval '1 day'`);
}
