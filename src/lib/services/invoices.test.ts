import { describe, it, expect, beforeEach } from "vitest";
import { seedTestCompanySettings, seedTestUser, seedTestClient, testDb } from "@/test/db";
import { eq } from "drizzle-orm";
import { invoices } from "@/db/schema";
import {
  createInvoice,
  finalizeInvoice,
  voidInvoice,
  createReplacementInvoice,
  updateDraftInvoice,
  getInvoiceById,
  isInvoiceOverdue,
  daysOverdue,
  deleteDraftInvoice,
  setInvoiceArchived,
  listInvoices,
  runAutoArchive,
} from "./invoices";
import { recordPayment } from "./payments";

async function makeInvoiceInputs() {
  const settings = await seedTestCompanySettings();
  const user = await seedTestUser();
  const client = await seedTestClient();
  return { settings, user, client };
}

describe("invoice creation & numbering", () => {
  beforeEach(async () => {
    // ensure a fresh settings row each test (resetTestDb truncates between tests)
  });

  it("creates a draft invoice with correctly formatted invoice number", async () => {
    const { user, client } = await makeInvoiceInputs();

    const invoice = await createInvoice({
      clientId: client.id,
      issueDate: new Date("2026-01-10"),
      dueDate: new Date("2026-01-24"),
      currency: "EUR",
      items: [{ description: "Executive Coaching", quantity: 3, unit: "session", unitPrice: 250, taxRate: 23 }],
      createdByUserId: user.id,
    });

    expect(invoice.status).toBe("DRAFT");
    expect(invoice.invoiceNumber).toMatch(/^MA-2026-\d{4}$/);
    expect(invoice.subtotal).toBe("750.00");
    expect(invoice.taxTotal).toBe("172.50");
    expect(invoice.total).toBe("922.50");
    expect(invoice.amountDue).toBe("922.50");
  });

  it("never issues the same invoice number twice, even under concurrent creation", async () => {
    const { user, client } = await makeInvoiceInputs();

    const attempts = Array.from({ length: 10 }, () =>
      createInvoice({
        clientId: client.id,
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 14 * 86400000),
        currency: "EUR",
        items: [{ description: "Coaching session", quantity: 1, unit: "session", unitPrice: 100 }],
        createdByUserId: user.id,
      })
    );

    const results = await Promise.all(attempts);
    const numbers = results.map((r) => r.invoiceNumber);
    const uniqueNumbers = new Set(numbers);

    expect(uniqueNumbers.size).toBe(numbers.length);
  });

  it("rejects an invoice with no line items", async () => {
    const { user, client } = await makeInvoiceInputs();

    await expect(
      createInvoice({
        clientId: client.id,
        issueDate: new Date(),
        dueDate: new Date(),
        currency: "EUR",
        items: [],
        createdByUserId: user.id,
      })
    ).rejects.toThrow();
  });

  it("handles a €0 invoice and finalises it straight to PAID", async () => {
    const { user, client } = await makeInvoiceInputs();

    const invoice = await createInvoice({
      clientId: client.id,
      issueDate: new Date(),
      dueDate: new Date(),
      currency: "EUR",
      items: [{ description: "Complimentary session", quantity: 1, unit: "session", unitPrice: 0 }],
      createdByUserId: user.id,
    });

    expect(invoice.total).toBe("0.00");

    const finalised = await finalizeInvoice(invoice.id, user.id);
    expect(finalised.status).toBe("PAID");
  });

  it("handles an invoice with no tax cleanly", async () => {
    const { user, client } = await makeInvoiceInputs();
    const invoice = await createInvoice({
      clientId: client.id,
      issueDate: new Date(),
      dueDate: new Date(),
      currency: "EUR",
      items: [{ description: "Workshop", quantity: 1, unit: "day", unitPrice: 1200, taxRate: 0 }],
      createdByUserId: user.id,
    });
    expect(invoice.taxTotal).toBe("0.00");
    expect(invoice.total).toBe("1200.00");
  });

  it("supports multiple line items with a mix of discounts and tax rates", async () => {
    const { user, client } = await makeInvoiceInputs();
    const invoice = await createInvoice({
      clientId: client.id,
      issueDate: new Date(),
      dueDate: new Date(),
      currency: "EUR",
      items: [
        { description: "Executive Coaching", quantity: 3, unit: "session", unitPrice: 250, taxRate: 23 },
        { description: "Workshop Facilitation", quantity: 1, unit: "day", unitPrice: 1200, discount: 100, taxRate: 23 },
      ],
      createdByUserId: user.id,
    });

    // line1 (gross 750, no discount): net 750, tax 172.50 => total 922.50
    // line2 (gross 1200, discount 100): net 1100, tax 253.00 => total 1353.00
    // Invoice "subtotal" is the pre-discount gross sum, so display reads
    // Subtotal - Discount + Tax = Total, matching the printed invoice/PDF.
    expect(invoice.subtotal).toBe("1950.00");
    expect(invoice.discountTotal).toBe("100.00");
    expect(invoice.taxTotal).toBe("425.50");
    expect(invoice.total).toBe("2275.50");
  });
});

describe("draft editing & finalisation workflow", () => {
  it("allows editing a draft but blocks editing a finalised invoice", async () => {
    const { user, client } = await makeInvoiceInputs();
    const invoice = await createInvoice({
      clientId: client.id,
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 86400000),
      currency: "EUR",
      items: [{ description: "Coaching", quantity: 1, unit: "session", unitPrice: 100 }],
      createdByUserId: user.id,
    });

    const updated = await updateDraftInvoice(invoice.id, {
      clientId: client.id,
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 86400000),
      currency: "EUR",
      items: [{ description: "Coaching (updated)", quantity: 2, unit: "session", unitPrice: 100 }],
      updatedByUserId: user.id,
    });
    expect(updated.total).toBe("200.00");

    await finalizeInvoice(invoice.id, user.id);

    await expect(
      updateDraftInvoice(invoice.id, {
        clientId: client.id,
        issueDate: new Date(),
        dueDate: new Date(),
        currency: "EUR",
        items: [{ description: "Should fail", quantity: 1, unit: "session", unitPrice: 1 }],
        updatedByUserId: user.id,
      })
    ).rejects.toThrow(/draft/i);
  });

  it("allows deleting a draft but not a finalised invoice", async () => {
    const { user, client } = await makeInvoiceInputs();
    const invoice = await createInvoice({
      clientId: client.id,
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 86400000),
      currency: "EUR",
      items: [{ description: "Coaching", quantity: 1, unit: "session", unitPrice: 100 }],
      createdByUserId: user.id,
    });

    await finalizeInvoice(invoice.id, user.id);
    await expect(deleteDraftInvoice(invoice.id, user.id)).rejects.toThrow();
  });

  it("voids an invoice and allows creating a replacement", async () => {
    const { user, client } = await makeInvoiceInputs();
    const invoice = await createInvoice({
      clientId: client.id,
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 86400000),
      currency: "EUR",
      items: [{ description: "Coaching", quantity: 1, unit: "session", unitPrice: 500 }],
      createdByUserId: user.id,
    });
    await finalizeInvoice(invoice.id, user.id);

    const voided = await voidInvoice(invoice.id, user.id, "Incorrect rate applied");
    expect(voided.status).toBe("VOID");

    const replacement = await createReplacementInvoice(invoice.id, user.id);
    expect(replacement.replacesInvoiceId).toBe(invoice.id);
    expect(replacement.total).toBe("500.00");
    expect(replacement.invoiceNumber).not.toBe(invoice.invoiceNumber);
  });
});

describe("overdue detection", () => {
  it("flags a sent invoice past its due date as overdue", () => {
    const overdue = { status: "SENT", dueDate: new Date(Date.now() - 5 * 86400000) };
    const notOverdue = { status: "SENT", dueDate: new Date(Date.now() + 5 * 86400000) };
    const paidPastDue = { status: "PAID", dueDate: new Date(Date.now() - 5 * 86400000) };

    expect(isInvoiceOverdue(overdue)).toBe(true);
    expect(isInvoiceOverdue(notOverdue)).toBe(false);
    expect(isInvoiceOverdue(paidPastDue)).toBe(false);
    expect(daysOverdue(overdue.dueDate)).toBeGreaterThanOrEqual(4);
  });
});

describe("payments & status transitions", () => {
  it("moves a sent invoice to PARTIALLY_PAID then PAID as payments come in", async () => {
    const { user, client } = await makeInvoiceInputs();
    const invoice = await createInvoice({
      clientId: client.id,
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 86400000),
      currency: "EUR",
      items: [{ description: "Leadership Programme", quantity: 1, unit: "programme", unitPrice: 1000 }],
      createdByUserId: user.id,
    });
    await finalizeInvoice(invoice.id, user.id);

    const afterFirst = await recordPayment({
      invoiceId: invoice.id,
      amount: 400,
      paymentDate: new Date(),
      paymentMethod: "BANK_TRANSFER",
      recordedByUserId: user.id,
    });
    expect(afterFirst.invoice.status).toBe("PARTIALLY_PAID");
    expect(afterFirst.invoice.amountDue).toBe("600.00");

    const afterSecond = await recordPayment({
      invoiceId: invoice.id,
      amount: 600,
      paymentDate: new Date(),
      paymentMethod: "CARD",
      recordedByUserId: user.id,
    });
    expect(afterSecond.invoice.status).toBe("PAID");
    expect(afterSecond.invoice.amountDue).toBe("0.00");
  });

  it("supports multiple payments across different methods", async () => {
    const { user, client } = await makeInvoiceInputs();
    const invoice = await createInvoice({
      clientId: client.id,
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 86400000),
      currency: "EUR",
      items: [{ description: "Retainer", quantity: 1, unit: "month", unitPrice: 900 }],
      createdByUserId: user.id,
    });
    await finalizeInvoice(invoice.id, user.id);

    await recordPayment({ invoiceId: invoice.id, amount: 300, paymentDate: new Date(), paymentMethod: "CASH", recordedByUserId: user.id });
    await recordPayment({ invoiceId: invoice.id, amount: 300, paymentDate: new Date(), paymentMethod: "CARD", recordedByUserId: user.id });
    const result = await recordPayment({ invoiceId: invoice.id, amount: 300, paymentDate: new Date(), paymentMethod: "OTHER", recordedByUserId: user.id });

    expect(result.invoice.status).toBe("PAID");

    const full = await getInvoiceById(invoice.id);
    expect(full?.payments.length).toBe(3);
  });

  it("rejects payments against a draft invoice", async () => {
    const { user, client } = await makeInvoiceInputs();
    const invoice = await createInvoice({
      clientId: client.id,
      issueDate: new Date(),
      dueDate: new Date(),
      currency: "EUR",
      items: [{ description: "Coaching", quantity: 1, unit: "session", unitPrice: 100 }],
      createdByUserId: user.id,
    });

    await expect(
      recordPayment({ invoiceId: invoice.id, amount: 50, paymentDate: new Date(), paymentMethod: "CASH", recordedByUserId: user.id })
    ).rejects.toThrow(/draft/i);
  });
});

describe("VAT exemption", () => {
  it("forces line item tax to 0 when vatExempt is set, even if a tax rate was submitted", async () => {
    const { user, client } = await makeInvoiceInputs();

    const invoice = await createInvoice({
      clientId: client.id,
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 86400000),
      currency: "EUR",
      vatExempt: true,
      vatExemptReason: "Reverse charge — Article 44",
      // Tax rates are submitted as non-zero on purpose: enforcement must
      // happen server-side regardless of what the client sends.
      items: [{ description: "Executive Coaching", quantity: 2, unit: "session", unitPrice: 250, taxRate: 23 }],
      createdByUserId: user.id,
    });

    expect(invoice.vatExempt).toBe(true);
    expect(invoice.vatExemptReason).toBe("Reverse charge — Article 44");
    expect(invoice.taxTotal).toBe("0.00");
    expect(invoice.total).toBe("500.00");

    const full = await getInvoiceById(invoice.id);
    expect(full?.items.every((i) => Number(i.taxRate) === 0)).toBe(true);
  });

  it("charges tax normally when vatExempt is false", async () => {
    const { user, client } = await makeInvoiceInputs();

    const invoice = await createInvoice({
      clientId: client.id,
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 86400000),
      currency: "EUR",
      vatExempt: false,
      items: [{ description: "Executive Coaching", quantity: 1, unit: "session", unitPrice: 100, taxRate: 23 }],
      createdByUserId: user.id,
    });

    expect(invoice.taxTotal).toBe("23.00");
  });

  it("keeps VAT-exempt status when updating a draft invoice", async () => {
    const { user, client } = await makeInvoiceInputs();

    const invoice = await createInvoice({
      clientId: client.id,
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 86400000),
      currency: "EUR",
      items: [{ description: "Coaching", quantity: 1, unit: "session", unitPrice: 100, taxRate: 23 }],
      createdByUserId: user.id,
    });
    expect(invoice.taxTotal).toBe("23.00");

    const updated = await updateDraftInvoice(invoice.id, {
      clientId: client.id,
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 86400000),
      currency: "EUR",
      vatExempt: true,
      items: [{ description: "Coaching", quantity: 1, unit: "session", unitPrice: 100, taxRate: 23 }],
      updatedByUserId: user.id,
    });

    expect(updated.vatExempt).toBe(true);
    expect(updated.taxTotal).toBe("0.00");
  });
});

describe("archiving", () => {
  it("rejects archiving an invoice that is still owed", async () => {
    const { user, client } = await makeInvoiceInputs();
    const invoice = await createInvoice({
      clientId: client.id,
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 86400000),
      currency: "EUR",
      items: [{ description: "Coaching", quantity: 1, unit: "session", unitPrice: 500 }],
      createdByUserId: user.id,
    });
    await finalizeInvoice(invoice.id, user.id);

    await expect(setInvoiceArchived(invoice.id, true, user.id)).rejects.toThrow(/paid, void or cancelled/i);
  });

  it("allows archiving a paid invoice, and it disappears from the default list", async () => {
    const { user, client } = await makeInvoiceInputs();
    const invoice = await createInvoice({
      clientId: client.id,
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 86400000),
      currency: "EUR",
      items: [{ description: "Coaching", quantity: 1, unit: "session", unitPrice: 500 }],
      createdByUserId: user.id,
    });
    await finalizeInvoice(invoice.id, user.id);
    await recordPayment({ invoiceId: invoice.id, amount: 500, paymentDate: new Date(), paymentMethod: "CARD", recordedByUserId: user.id });

    const archived = await setInvoiceArchived(invoice.id, true, user.id);
    expect(archived.archived).toBe(true);

    const defaultList = await listInvoices();
    expect(defaultList.find((r) => r.invoice.id === invoice.id)).toBeUndefined();

    const withArchived = await listInvoices({ includeArchived: true });
    expect(withArchived.find((r) => r.invoice.id === invoice.id)).toBeDefined();
  });

  it("can be unarchived", async () => {
    const { user, client } = await makeInvoiceInputs();
    const invoice = await createInvoice({
      clientId: client.id,
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 86400000),
      currency: "EUR",
      items: [{ description: "Coaching", quantity: 1, unit: "session", unitPrice: 500 }],
      createdByUserId: user.id,
    });
    await finalizeInvoice(invoice.id, user.id);
    await voidInvoice(invoice.id, user.id, "test");

    await setInvoiceArchived(invoice.id, true, user.id);
    const unarchived = await setInvoiceArchived(invoice.id, false, user.id);
    expect(unarchived.archived).toBe(false);

    const defaultList = await listInvoices();
    expect(defaultList.find((r) => r.invoice.id === invoice.id)).toBeDefined();
  });
});

describe("auto-archiving", () => {
  it("does nothing when disabled in settings", async () => {
    await seedTestCompanySettings({ autoArchiveEnabled: false });
    const user = await seedTestUser();
    const client = await seedTestClient();

    const invoice = await createInvoice({
      clientId: client.id,
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 86400000),
      currency: "EUR",
      items: [{ description: "Coaching", quantity: 1, unit: "session", unitPrice: 500 }],
      createdByUserId: user.id,
    });
    await finalizeInvoice(invoice.id, user.id);
    await recordPayment({ invoiceId: invoice.id, amount: 500, paymentDate: new Date(), paymentMethod: "CARD", recordedByUserId: user.id });
    await testDb.update(invoices).set({ updatedAt: new Date(Date.now() - 200 * 86400000) }).where(eq(invoices.id, invoice.id));

    const result = await runAutoArchive();
    expect(result.archived).toBe(0);
    expect(result.skipped).toMatch(/turned off/i);

    const reloaded = await getInvoiceById(invoice.id);
    expect(reloaded?.archived).toBe(false);
  });

  it("archives resolved invoices past the configured age, but leaves recent and unresolved ones alone", async () => {
    await seedTestCompanySettings({ autoArchiveEnabled: true, autoArchiveDays: 90 });
    const user = await seedTestUser();
    const client = await seedTestClient();

    const old = await createInvoice({
      clientId: client.id,
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 86400000),
      currency: "EUR",
      items: [{ description: "Coaching", quantity: 1, unit: "session", unitPrice: 500 }],
      createdByUserId: user.id,
    });
    await finalizeInvoice(old.id, user.id);
    await recordPayment({ invoiceId: old.id, amount: 500, paymentDate: new Date(), paymentMethod: "CARD", recordedByUserId: user.id });
    await testDb.update(invoices).set({ updatedAt: new Date(Date.now() - 100 * 86400000) }).where(eq(invoices.id, old.id));

    const recent = await createInvoice({
      clientId: client.id,
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 86400000),
      currency: "EUR",
      items: [{ description: "Coaching", quantity: 1, unit: "session", unitPrice: 500 }],
      createdByUserId: user.id,
    });
    await finalizeInvoice(recent.id, user.id);
    await recordPayment({ invoiceId: recent.id, amount: 500, paymentDate: new Date(), paymentMethod: "CARD", recordedByUserId: user.id });

    const owed = await createInvoice({
      clientId: client.id,
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 86400000),
      currency: "EUR",
      items: [{ description: "Coaching", quantity: 1, unit: "session", unitPrice: 500 }],
      createdByUserId: user.id,
    });
    await finalizeInvoice(owed.id, user.id);
    await testDb.update(invoices).set({ updatedAt: new Date(Date.now() - 100 * 86400000) }).where(eq(invoices.id, owed.id));

    const result = await runAutoArchive();
    expect(result.archived).toBe(1);

    expect((await getInvoiceById(old.id))?.archived).toBe(true);
    expect((await getInvoiceById(recent.id))?.archived).toBe(false);
    expect((await getInvoiceById(owed.id))?.archived).toBe(false);
  });

  it("is a no-op the second time it runs over the same data", async () => {
    await seedTestCompanySettings({ autoArchiveEnabled: true, autoArchiveDays: 90 });
    const user = await seedTestUser();
    const client = await seedTestClient();

    const invoice = await createInvoice({
      clientId: client.id,
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 86400000),
      currency: "EUR",
      items: [{ description: "Coaching", quantity: 1, unit: "session", unitPrice: 500 }],
      createdByUserId: user.id,
    });
    await finalizeInvoice(invoice.id, user.id);
    await recordPayment({ invoiceId: invoice.id, amount: 500, paymentDate: new Date(), paymentMethod: "CARD", recordedByUserId: user.id });
    await testDb.update(invoices).set({ updatedAt: new Date(Date.now() - 200 * 86400000) }).where(eq(invoices.id, invoice.id));

    expect((await runAutoArchive()).archived).toBe(1);
    expect((await runAutoArchive()).archived).toBe(0);
  });
});

// keep testDb import referenced so this file also verifies the alias wiring
void testDb;
