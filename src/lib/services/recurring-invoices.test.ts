import { describe, it, expect } from "vitest";
import { eq } from "drizzle-orm";
import { seedTestCompanySettings, seedTestUser, seedTestClient, testDb } from "@/test/db";
import { recurringInvoiceItems } from "@/db/schema";
import {
  createRecurringInvoice,
  updateRecurringInvoice,
  setRecurringInvoiceStatus,
  endRecurringInvoice,
  deleteRecurringInvoice,
  getRecurringInvoiceById,
  runDueRecurringInvoices,
  advanceByFrequency,
} from "./recurring-invoices";

async function makeInputs() {
  const settings = await seedTestCompanySettings();
  const user = await seedTestUser();
  const client = await seedTestClient();
  return { settings, user, client };
}

function schedule(clientId: string, userId: string, overrides: Partial<Parameters<typeof createRecurringInvoice>[0]> = {}) {
  return createRecurringInvoice({
    clientId,
    frequency: "MONTHLY",
    startDate: new Date(Date.now() - 86400000), // yesterday — immediately due
    currency: "EUR",
    paymentTermsDays: 14,
    items: [{ description: "Monthly retainer", quantity: 1, unit: "month", unitPrice: 500 }],
    createdByUserId: userId,
    ...overrides,
  });
}

describe("advanceByFrequency", () => {
  it("steps forward by exactly one unit per frequency", () => {
    const base = new Date("2026-01-15T00:00:00Z");
    expect(advanceByFrequency(base, "WEEKLY").toISOString().slice(0, 10)).toBe("2026-01-22");
    expect(advanceByFrequency(base, "MONTHLY").toISOString().slice(0, 10)).toBe("2026-02-15");
    expect(advanceByFrequency(base, "QUARTERLY").toISOString().slice(0, 10)).toBe("2026-04-15");
    expect(advanceByFrequency(base, "YEARLY").toISOString().slice(0, 10)).toBe("2027-01-15");
  });
});

describe("createRecurringInvoice", () => {
  it("creates a schedule with nextRunDate seeded from startDate", async () => {
    const { user, client } = await makeInputs();
    const created = await schedule(client.id, user.id);
    expect(created.status).toBe("ACTIVE");
    expect(created.nextRunDate.getTime()).toBe(created.startDate.getTime());

    const full = await getRecurringInvoiceById(created.id);
    expect(full?.items).toHaveLength(1);
    expect(full?.items[0].description).toBe("Monthly retainer");
  });

  it("rejects an end date that isn't after the start date", async () => {
    const { user, client } = await makeInputs();
    const start = new Date();
    await expect(schedule(client.id, user.id, { startDate: start, endDate: start })).rejects.toThrow(/end date/i);
  });

  it("rejects a schedule with no line items", async () => {
    const { user, client } = await makeInputs();
    await expect(schedule(client.id, user.id, { items: [] })).rejects.toThrow(/line item/i);
  });
});

describe("runDueRecurringInvoices", () => {
  it("does nothing for a schedule whose next run date is in the future", async () => {
    const { user, client } = await makeInputs();
    await schedule(client.id, user.id, { startDate: new Date(Date.now() + 30 * 86400000) });

    const result = await runDueRecurringInvoices();
    expect(result.generated).toBe(0);
  });

  it("generates a draft invoice and advances nextRunDate, and is idempotent within the same day", async () => {
    const { user, client } = await makeInputs();
    const created = await schedule(client.id, user.id);

    const first = await runDueRecurringInvoices();
    expect(first.generated).toBe(1);

    const afterFirst = await getRecurringInvoiceById(created.id);
    expect(afterFirst?.generatedInvoices).toHaveLength(1);
    expect(afterFirst?.generatedInvoices[0].status).toBe("DRAFT");
    // PGlite (test-only in-memory Postgres) formats whole-number NUMERIC
    // values without the declared scale's trailing zeros — a known quirk of
    // this test harness, not a real app bug (formatMoney() parses both
    // forms identically via Decimal). Compare numerically instead.
    expect(Number(afterFirst?.generatedInvoices[0].total)).toBe(500);
    expect(afterFirst?.nextRunDate.getTime()).toBeGreaterThan(created.startDate.getTime());

    // Same sweep run again immediately — must not double-generate, since
    // nextRunDate has already moved into the future.
    const second = await runDueRecurringInvoices();
    expect(second.generated).toBe(0);

    const afterSecond = await getRecurringInvoiceById(created.id);
    expect(afterSecond?.generatedInvoices).toHaveLength(1);
  });

  it("ends the schedule once the next occurrence would fall after endDate", async () => {
    const { user, client } = await makeInputs();
    const start = new Date(Date.now() - 86400000);
    const endDate = new Date(start.getTime() + 5 * 24 * 60 * 60 * 1000); // 5 days out — before the next MONTHLY step
    const created = await schedule(client.id, user.id, { startDate: start, endDate });

    const result = await runDueRecurringInvoices();
    expect(result.generated).toBe(1);
    expect(result.ended).toBe(1);

    const after = await getRecurringInvoiceById(created.id);
    expect(after?.status).toBe("ENDED");
  });

  it("skips a schedule that has no line items rather than failing the whole sweep", async () => {
    const { user, client } = await makeInputs();
    // The public API always requires at least one item, so this state can
    // only arise from data corruption — simulate it by deleting the items
    // directly, bypassing the service layer, the way the app never would.
    const empty = await schedule(client.id, user.id);
    await testDb.delete(recurringInvoiceItems).where(eq(recurringInvoiceItems.recurringInvoiceId, empty.id));

    // A second, independent schedule with a real item should still generate
    // even though the first one in the sweep fails.
    const healthy = await schedule(client.id, user.id);

    const result = await runDueRecurringInvoices();
    expect(result.generated).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatch(/no line items/i);

    const healthyAfter = await getRecurringInvoiceById(healthy.id);
    expect(healthyAfter?.generatedInvoices).toHaveLength(1);
  });
});

describe("status transitions", () => {
  it("pauses and resumes a schedule", async () => {
    const { user, client } = await makeInputs();
    const created = await schedule(client.id, user.id);

    const paused = await setRecurringInvoiceStatus(created.id, "PAUSED", user.id);
    expect(paused.status).toBe("PAUSED");

    // Paused schedules are never swept even if nextRunDate is due.
    const result = await runDueRecurringInvoices();
    expect(result.generated).toBe(0);

    const resumed = await setRecurringInvoiceStatus(created.id, "ACTIVE", user.id);
    expect(resumed.status).toBe("ACTIVE");
  });

  it("ends a schedule permanently", async () => {
    const { user, client } = await makeInputs();
    const created = await schedule(client.id, user.id);

    const ended = await endRecurringInvoice(created.id, user.id);
    expect(ended.status).toBe("ENDED");

    await expect(setRecurringInvoiceStatus(created.id, "ACTIVE", user.id)).rejects.toThrow(/already ended/i);
  });
});

describe("deleteRecurringInvoice", () => {
  it("allows deleting a schedule that has never generated an invoice", async () => {
    const { user, client } = await makeInputs();
    const created = await schedule(client.id, user.id, { startDate: new Date(Date.now() + 30 * 86400000) });

    await deleteRecurringInvoice(created.id, user.id);
    expect(await getRecurringInvoiceById(created.id)).toBeNull();
  });

  it("refuses to delete a schedule that has already generated an invoice", async () => {
    const { user, client } = await makeInputs();
    const created = await schedule(client.id, user.id);
    await runDueRecurringInvoices();

    await expect(deleteRecurringInvoice(created.id, user.id)).rejects.toThrow(/end it instead/i);
  });
});
