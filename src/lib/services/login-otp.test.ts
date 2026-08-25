import { describe, it, expect, vi, afterEach } from "vitest";
import { seedTestUser, testDb } from "@/test/db";
import { loginOtpCodes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createLoginOtp, verifyLoginOtp } from "./login-otp";

describe("login OTP", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("verifies a freshly issued code", async () => {
    const user = await seedTestUser();
    const code = await createLoginOtp(user.id);

    expect(code).toMatch(/^\d{6}$/);

    const result = await verifyLoginOtp(user.id, code);
    expect(result).toEqual({ ok: true });
  });

  it("rejects a wrong code without consuming the real one", async () => {
    const user = await seedTestUser();
    const code = await createLoginOtp(user.id);

    const wrongCode = code === "000000" ? "111111" : "000000";
    const wrongResult = await verifyLoginOtp(user.id, wrongCode);
    expect(wrongResult).toEqual({ ok: false, reason: "wrong_code" });

    const rightResult = await verifyLoginOtp(user.id, code);
    expect(rightResult).toEqual({ ok: true });
  });

  it("is single-use — the same code cannot be verified twice", async () => {
    const user = await seedTestUser();
    const code = await createLoginOtp(user.id);

    expect(await verifyLoginOtp(user.id, code)).toEqual({ ok: true });
    expect(await verifyLoginOtp(user.id, code)).toEqual({ ok: false, reason: "no_code" });
  });

  it("locks out after too many wrong attempts, even with the correct code", async () => {
    const user = await seedTestUser();
    const code = await createLoginOtp(user.id);
    const wrongCode = code === "000000" ? "111111" : "000000";

    for (let i = 0; i < 5; i++) {
      await verifyLoginOtp(user.id, wrongCode);
    }

    const result = await verifyLoginOtp(user.id, code);
    expect(result).toEqual({ ok: false, reason: "too_many_attempts" });
  });

  it("issuing a new code invalidates the previous unconsumed one", async () => {
    const user = await seedTestUser();
    const firstCode = await createLoginOtp(user.id);
    await createLoginOtp(user.id);

    const result = await verifyLoginOtp(user.id, firstCode);
    expect(result.ok).toBe(false);
  });

  it("rejects an expired code", async () => {
    const user = await seedTestUser();
    const code = await createLoginOtp(user.id);

    // Force the stored code into the past instead of relying on fake timers
    // (which would also freeze bcrypt's internal timing).
    await testDb.update(loginOtpCodes).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(loginOtpCodes.userId, user.id));

    const result = await verifyLoginOtp(user.id, code);
    expect(result).toEqual({ ok: false, reason: "expired" });
  });

  it("reports no_code when nothing has ever been issued", async () => {
    const user = await seedTestUser();
    const result = await verifyLoginOtp(user.id, "123456");
    expect(result).toEqual({ ok: false, reason: "no_code" });
  });
});
