"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, createPendingTwoFactor, getPendingTwoFactorUserId, clearPendingTwoFactor } from "@/lib/auth/session";
import { checkRateLimit, resetRateLimit, getClientIp } from "@/lib/auth/rate-limit";
import { recordAuditLog } from "@/lib/services/audit";
import { createLoginOtp, verifyLoginOtp } from "@/lib/services/login-otp";
import { getEmailProvider } from "@/lib/email";
import { renderLoginOtpEmail } from "@/lib/email/templates";
import { getCompanySettings } from "@/lib/services/settings";

// 2FA is currently disabled — MotivAction's Microsoft 365 mailbox isn't yet
// configured to actually send the code (see README > Email configuration),
// which made the OTP step a dead end rather than a security improvement.
// The OTP infrastructure below (createLoginOtp/verifyLoginOtp, the
// /login/verify page, the pending-2FA cookie) is left in place — flip this
// back to `true` once SMTP is working to re-enable it with no other changes.
const TWO_FACTOR_ENABLED = false;

export interface LoginState {
  error?: string;
}

// Deliberately looser than the per-account limit below: this bucket exists
// to stop one source hammering many different email addresses (account
// enumeration / a broad credential-stuffing run), not to punish normal
// retries from a shared office IP.
const IP_MAX_ATTEMPTS = 30;

function safeRedirectPath(path: string): string {
  return path.startsWith("/") ? path : "/dashboard";
}

/** Step 1: email + password. On success, sends an OTP code by email and moves to step 2 — it does NOT create a real session yet. */
export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "/dashboard");

  const ip = getClientIp(await headers());

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const ipRateLimit = checkRateLimit(`login:ip:${ip}`, { maxAttempts: IP_MAX_ATTEMPTS });
  const emailRateLimit = checkRateLimit(`login:email:${email}`);
  if (!ipRateLimit.allowed || !emailRateLimit.allowed) {
    const retryAfterSeconds = Math.max(ipRateLimit.retryAfterSeconds ?? 0, emailRateLimit.retryAfterSeconds ?? 0);
    return { error: `Too many attempts. Try again in ${retryAfterSeconds}s.` };
  }

  const [user] = await db.select().from(users).where(sql`lower(${users.email}) = ${email}`).limit(1);

  if (!user || !user.active) {
    await recordAuditLog(db, { userId: null, entityType: "auth", entityId: email, action: "LOGIN_FAILED", newValues: { ip, reason: "no_such_active_account" } });
    return { error: "Invalid email or password." };
  }

  const validPassword = await verifyPassword(password, user.passwordHash);
  if (!validPassword) {
    await recordAuditLog(db, { userId: user.id, entityType: "auth", entityId: email, action: "LOGIN_FAILED", newValues: { ip, reason: "wrong_password" } });
    return { error: "Invalid email or password." };
  }

  resetRateLimit(`login:email:${email}`);

  if (!TWO_FACTOR_ENABLED) {
    await createSession(user.id);
    await recordAuditLog(db, { userId: user.id, entityType: "auth", entityId: email, action: "LOGIN_SUCCESS", newValues: { ip } });
    redirect(safeRedirectPath(redirectTo));
  }

  const code = await createLoginOtp(user.id);
  const settings = await getCompanySettings();
  const { subject, html, text } = renderLoginOtpEmail({ companyName: settings.tradingName || settings.companyName, code });
  const provider = await getEmailProvider();
  const emailResult = await provider.send({ to: user.email, subject, html, text });

  await createPendingTwoFactor(user.id);
  await recordAuditLog(db, {
    userId: user.id,
    entityType: "auth",
    entityId: email,
    action: "OTP_SENT",
    newValues: { ip, mocked: emailResult.mocked },
  });

  const params = new URLSearchParams({ redirectTo: safeRedirectPath(redirectTo) });
  redirect(`/login/verify?${params.toString()}`);
}

export interface VerifyOtpState {
  error?: string;
}

/** Step 2: the emailed code. Only on success does a real session get created. */
export async function verifyOtpAction(_prevState: VerifyOtpState, formData: FormData): Promise<VerifyOtpState> {
  const code = String(formData.get("code") ?? "").trim();
  const redirectTo = safeRedirectPath(String(formData.get("redirectTo") ?? "/dashboard"));

  const userId = await getPendingTwoFactorUserId();
  if (!userId) {
    return { error: "Your sign-in session has expired. Please start again." };
  }

  const ip = getClientIp(await headers());
  const rateLimit = checkRateLimit(`otp-verify:${userId}`, { maxAttempts: 8, windowMs: 10 * 60 * 1000 });
  if (!rateLimit.allowed) {
    return { error: `Too many attempts. Try again in ${rateLimit.retryAfterSeconds}s.` };
  }

  if (!/^\d{6}$/.test(code)) {
    return { error: "Enter the 6-digit code from your email." };
  }

  const result = await verifyLoginOtp(userId, code);
  if (!result.ok) {
    const messages: Record<typeof result.reason, string> = {
      no_code: "No active code found. Request a new one.",
      expired: "That code has expired. Request a new one.",
      too_many_attempts: "Too many incorrect attempts. Request a new code.",
      wrong_code: "Incorrect code. Please try again.",
    };
    await recordAuditLog(db, { userId, entityType: "auth", entityId: userId, action: "OTP_FAILED", newValues: { ip, reason: result.reason } });
    return { error: messages[result.reason] };
  }

  await clearPendingTwoFactor();
  await createSession(userId);
  await recordAuditLog(db, { userId, entityType: "auth", entityId: userId, action: "LOGIN_SUCCESS", newValues: { ip } });

  redirect(redirectTo);
}

export interface ResendOtpState {
  message?: string;
  error?: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- signature required by useActionState, neither arg is read
export async function resendOtpAction(prevState: ResendOtpState, formData: FormData): Promise<ResendOtpState> {
  const userId = await getPendingTwoFactorUserId();
  if (!userId) {
    return { error: "Your sign-in session has expired. Please start again." };
  }

  const rateLimit = checkRateLimit(`otp-resend:${userId}`, { maxAttempts: 3, windowMs: 15 * 60 * 1000 });
  if (!rateLimit.allowed) {
    return { error: `Please wait before requesting another code (try again in ${rateLimit.retryAfterSeconds}s).` };
  }

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) {
    return { error: "Account not found." };
  }

  const code = await createLoginOtp(userId);
  const settings = await getCompanySettings();
  const { subject, html, text } = renderLoginOtpEmail({ companyName: settings.tradingName || settings.companyName, code });
  const provider = await getEmailProvider();
  await provider.send({ to: user.email, subject, html, text });

  return { message: "A new code has been sent." };
}
