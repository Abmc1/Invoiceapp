import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword, isPasswordStrongEnough } from "./password";

describe("password hashing", () => {
  it("hashes a password and can verify it back", async () => {
    const hash = await hashPassword("SuperSecret123");
    expect(hash).not.toBe("SuperSecret123");
    expect(await verifyPassword("SuperSecret123", hash)).toBe(true);
    expect(await verifyPassword("WrongPassword1", hash)).toBe(false);
  });

  it("produces a different hash each time (random salt)", async () => {
    const hash1 = await hashPassword("SuperSecret123");
    const hash2 = await hashPassword("SuperSecret123");
    expect(hash1).not.toBe(hash2);
  });

  it("enforces a minimum password policy", () => {
    expect(isPasswordStrongEnough("short1")).toBe(false);
    expect(isPasswordStrongEnough("nonumbers")).toBe(false);
    expect(isPasswordStrongEnough("ValidPass123")).toBe(true);
  });
});
