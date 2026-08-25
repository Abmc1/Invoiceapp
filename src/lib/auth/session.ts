import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";

const SESSION_COOKIE = "motivaction_session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

const PENDING_2FA_COOKIE = "motivaction_pending_2fa";
const PENDING_2FA_DURATION_MS = 10 * 60 * 1000; // 10 minutes — matches the OTP code's own expiry

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  // 32 chars matches the ~256 bits of entropy `openssl rand -base64 32`
  // produces — the documented, recommended way to generate this value.
  if (!secret || secret.length < 32) {
    throw new Error(
      "AUTH_SECRET is not set (or too short — at least 32 characters). Generate one with `openssl rand -base64 32` and set it in your environment."
    );
  }
  return new TextEncoder().encode(secret);
}

async function signSessionToken(sessionId: string): Promise<string> {
  return new SignJWT({ sid: sessionId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor((Date.now() + SESSION_DURATION_MS) / 1000))
    .sign(getSecretKey());
}

async function verifySessionToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), { algorithms: ["HS256"] });
    return typeof payload.sid === "string" ? payload.sid : null;
  } catch {
    return null;
  }
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "USER";
}

/**
 * Creates a database-backed session for the given user and sets the signed,
 * httpOnly session cookie. The cookie only carries an opaque session id
 * (never the user's role or PII), so authorization is always re-checked
 * against the database.
 */
export async function createSession(userId: string): Promise<void> {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  const [session] = await db
    .insert(sessions)
    .values({ userId, expiresAt })
    .returning({ id: sessions.id });

  const token = await signSessionToken(session.id);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // 'strict' rather than 'lax': this app has no legitimate reason to ever
    // receive the session cookie on a request that originated from another
    // site (no external redirect-in flows, no cross-site embeds), so there's
    // no reason to accept the weaker default.
    sameSite: "strict",
    expires: expiresAt,
    path: "/",
  });
}

/** Returns the current request's session ID (not the user), or null. Used to exclude "this" session when invalidating others. */
export async function getCurrentSessionId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/**
 * Deletes every other active session for a user — used after a password
 * change, so a session cookie stolen before the change (via XSS, a shared
 * computer, a leaked backup, etc.) stops working immediately rather than
 * remaining valid for up to 7 more days. The session making the change is
 * deliberately kept alive so the user isn't logged out of their own action.
 */
export async function invalidateOtherSessions(userId: string, keepSessionId: string | null): Promise<void> {
  const conditions = keepSessionId
    ? and(eq(sessions.userId, userId), sql`${sessions.id} != ${keepSessionId}`)
    : eq(sessions.userId, userId);
  await db.delete(sessions).where(conditions);
}

/**
 * Secure session check: verifies the signed cookie, then confirms the
 * session still exists (and hasn't expired) in the database, and loads the
 * current user record. Use this in Server Components, Server Actions, and
 * Route Handlers before touching any data.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const sessionId = await verifySessionToken(token);
  if (!sessionId) return null;

  const rows = await db
    .select({
      sessionId: sessions.id,
      expiresAt: sessions.expiresAt,
      userId: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      active: users.active,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, sessionId))
    .limit(1);

  const row = rows[0];
  if (!row) return null;
  if (row.expiresAt.getTime() < Date.now()) return null;
  if (!row.active) return null;

  return { id: row.userId, name: row.name, email: row.email, role: row.role };
}

/** Throws if there is no authenticated user. Use for Server Actions / Route Handlers. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHENTICATED");
  }
  return user;
}

/** Throws if there is no authenticated ADMIN user. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    throw new Error("FORBIDDEN");
  }
  return user;
}

/**
 * For admin-only Server Component pages: redirects non-admins to their
 * account settings instead of throwing, so a USER who follows a stale link
 * (or types the URL) gets a normal navigation rather than an error screen.
 */
export async function requireAdminPage(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (user?.role !== "ADMIN") {
    redirect("/settings/account");
  }
  return user;
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    const sessionId = await verifySessionToken(token);
    if (sessionId) {
      await db.delete(sessions).where(eq(sessions.id, sessionId));
    }
  }
  cookieStore.delete(SESSION_COOKIE);
}

// ---------------------------------------------------------------------------
// Pending 2FA state
//
// After a correct password, the user isn't logged in yet — they hold a
// short-lived, signed "pending 2FA" cookie identifying *which* account is
// completing verification, nothing more. It carries no authorization: proxy.ts
// and every `requireUser()`/`requireAdmin()` check only ever look at
// SESSION_COOKIE, so this cookie alone cannot access any protected route or
// data. Its only job is letting /login/verify know whose OTP to check.
// ---------------------------------------------------------------------------

async function signPendingTwoFactorToken(userId: string): Promise<string> {
  return new SignJWT({ uid: userId, purpose: "2fa" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor((Date.now() + PENDING_2FA_DURATION_MS) / 1000))
    .sign(getSecretKey());
}

async function verifyPendingTwoFactorToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), { algorithms: ["HS256"] });
    if (payload.purpose !== "2fa") return null;
    return typeof payload.uid === "string" ? payload.uid : null;
  } catch {
    return null;
  }
}

/** Marks `userId` as having passed the password step and awaiting an OTP code. */
export async function createPendingTwoFactor(userId: string): Promise<void> {
  const token = await signPendingTwoFactorToken(userId);
  const cookieStore = await cookies();
  cookieStore.set(PENDING_2FA_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: PENDING_2FA_DURATION_MS / 1000,
    path: "/",
  });
}

/** Returns the userId awaiting OTP verification, or null if there's no valid pending 2FA cookie. */
export async function getPendingTwoFactorUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(PENDING_2FA_COOKIE)?.value;
  if (!token) return null;
  return verifyPendingTwoFactorToken(token);
}

export async function clearPendingTwoFactor(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(PENDING_2FA_COOKIE);
}

export { SESSION_COOKIE };
