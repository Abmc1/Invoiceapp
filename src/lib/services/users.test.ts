import { describe, it, expect } from "vitest";
import { seedTestUser } from "@/test/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { changeOwnPassword } from "./users";
import { testDb } from "@/test/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

describe("changeOwnPassword", () => {
  it("changes the password when the current one is correct", async () => {
    const user = await seedTestUser({ passwordHash: await hashPassword("OldPass123") });

    await changeOwnPassword(user.id, "OldPass123", "NewPass456");

    const [updated] = await testDb.select().from(users).where(eq(users.id, user.id)).limit(1);
    expect(await verifyPassword("NewPass456", updated.passwordHash)).toBe(true);
    expect(await verifyPassword("OldPass123", updated.passwordHash)).toBe(false);
  });

  it("rejects the change when the current password is wrong", async () => {
    const user = await seedTestUser({ passwordHash: await hashPassword("OldPass123") });

    await expect(changeOwnPassword(user.id, "WrongPassword1", "NewPass456")).rejects.toThrow(/incorrect/i);
  });

  it("rejects a new password that doesn't meet the policy", async () => {
    const user = await seedTestUser({ passwordHash: await hashPassword("OldPass123") });

    await expect(changeOwnPassword(user.id, "OldPass123", "short")).rejects.toThrow(/at least 8 characters/i);
  });
});
