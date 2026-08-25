import { describe, it, expect, vi, beforeEach } from "vitest";

// In-memory fake cookie jar standing in for next/headers' cookies(), so
// session creation/verification can be exercised without a real Next.js
// request context.
const cookieStore = new Map<string, string>();

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (cookieStore.has(name) ? { name, value: cookieStore.get(name)! } : undefined),
    set: (name: string, value: string) => {
      cookieStore.set(name, value);
    },
    delete: (name: string) => {
      cookieStore.delete(name);
    },
  }),
}));

process.env.AUTH_SECRET = "test-secret-at-least-16-chars-long";

const { createSession, getCurrentUser, requireUser, requireAdmin, destroySession } = await import("./session");
const { seedTestUser } = await import("@/test/db");

describe("session auth", () => {
  beforeEach(() => {
    cookieStore.clear();
  });

  it("creates a session and resolves the current user from it", async () => {
    const user = await seedTestUser({ role: "USER" });
    await createSession(user.id);

    const current = await getCurrentUser();
    expect(current?.id).toBe(user.id);
    expect(current?.role).toBe("USER");
  });

  it("returns null when there is no session cookie", async () => {
    expect(await getCurrentUser()).toBeNull();
  });

  it("requireUser throws when unauthenticated", async () => {
    await expect(requireUser()).rejects.toThrow("UNAUTHENTICATED");
  });

  it("requireAdmin throws FORBIDDEN for a non-admin user", async () => {
    const user = await seedTestUser({ role: "USER" });
    await createSession(user.id);
    await expect(requireAdmin()).rejects.toThrow("FORBIDDEN");
  });

  it("requireAdmin succeeds for an admin user", async () => {
    const admin = await seedTestUser({ role: "ADMIN" });
    await createSession(admin.id);
    const resolved = await requireAdmin();
    expect(resolved.role).toBe("ADMIN");
  });

  it("destroySession removes the session so getCurrentUser returns null again", async () => {
    const user = await seedTestUser({ role: "ADMIN" });
    await createSession(user.id);
    expect(await getCurrentUser()).not.toBeNull();

    await destroySession();
    expect(await getCurrentUser()).toBeNull();
  });

  it("rejects a deactivated user's session", async () => {
    const user = await seedTestUser({ role: "USER", active: false });
    await createSession(user.id);
    expect(await getCurrentUser()).toBeNull();
  });
});
