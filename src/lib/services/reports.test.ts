import { describe, it, expect } from "vitest";
import { seedTestCompanySettings, seedTestUser, seedTestClient } from "@/test/db";
import { createInvoice, finalizeInvoice } from "./invoices";
import { vatReport, outstandingByClient } from "./reports";
import { recordPayment } from "./payments";

async function setup() {
  await seedTestCompanySettings();
  const user = await seedTestUser();
  const client = await seedTestClient();
  return { user, client };
}

describe("vatReport", () => {
  it("groups net/VAT/gross by the tax rate actually charged", async () => {
    const { user, client } = await setup();
    const today = new Date();

    const standard = await createInvoice({
      clientId: client.id,
      issueDate: today,
      dueDate: new Date(Date.now() + 86400000),
      currency: "EUR",
      items: [{ description: "Coaching", quantity: 1, unit: "session", unitPrice: 1000, taxRate: 23 }],
      createdByUserId: user.id,
    });
    await finalizeInvoice(standard.id, user.id);

    const zeroRated = await createInvoice({
      clientId: client.id,
      issueDate: today,
      dueDate: new Date(Date.now() + 86400000),
      currency: "EUR",
      items: [{ description: "Training", quantity: 1, unit: "day", unitPrice: 500, taxRate: 0 }],
      createdByUserId: user.id,
    });
    await finalizeInvoice(zeroRated.id, user.id);

    const from = new Date(today.getFullYear(), today.getMonth(), 1);
    const to = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const report = await vatReport({ from, to });

    const rate23 = report.byRate.find((r) => Number(r.taxRate) === 23);
    const rate0 = report.byRate.find((r) => Number(r.taxRate) === 0);

    expect(rate23?.net).toBe("1000.00");
    expect(rate23?.vat).toBe("230.00");
    expect(rate0?.net).toBe("500.00");
    expect(rate0?.vat).toBe("0.00");

    expect(report.totals.net).toBe("1500.00");
    expect(report.totals.vat).toBe("230.00");
    expect(report.totals.gross).toBe("1730.00");
  });

  it("excludes VAT-exempt invoices from the rate breakdown and reports them separately", async () => {
    const { user, client } = await setup();
    const today = new Date();

    const exempt = await createInvoice({
      clientId: client.id,
      issueDate: today,
      dueDate: new Date(Date.now() + 86400000),
      currency: "EUR",
      vatExempt: true,
      items: [{ description: "Overseas coaching", quantity: 1, unit: "session", unitPrice: 750 }],
      createdByUserId: user.id,
    });
    await finalizeInvoice(exempt.id, user.id);

    const from = new Date(today.getFullYear(), today.getMonth(), 1);
    const to = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const report = await vatReport({ from, to });

    expect(report.exempt.invoiceCount).toBe(1);
    expect(report.exempt.net).toBe("750.00");
  });

  it("does not include draft invoices", async () => {
    const { user, client } = await setup();
    const today = new Date();

    await createInvoice({
      clientId: client.id,
      issueDate: today,
      dueDate: new Date(Date.now() + 86400000),
      currency: "EUR",
      items: [{ description: "Draft only", quantity: 1, unit: "session", unitPrice: 1000, taxRate: 23 }],
      createdByUserId: user.id,
    });

    const from = new Date(today.getFullYear(), today.getMonth(), 1);
    const to = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const report = await vatReport({ from, to });

    expect(report.byRate.length).toBe(0);
    expect(Number(report.totals.net)).toBe(0);
  });
});

describe("outstandingByClient", () => {
  it("reports invoiced, paid and outstanding totals per client", async () => {
    const { user, client } = await setup();

    const invoice = await createInvoice({
      clientId: client.id,
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 86400000),
      currency: "EUR",
      items: [{ description: "Coaching", quantity: 1, unit: "session", unitPrice: 1000 }],
      createdByUserId: user.id,
    });
    await finalizeInvoice(invoice.id, user.id);
    await recordPayment({ invoiceId: invoice.id, amount: 400, paymentDate: new Date(), paymentMethod: "CARD", recordedByUserId: user.id });

    const rows = await outstandingByClient();
    const row = rows.find((r) => r.clientId === client.id);

    expect(row?.totalInvoiced).toBe("1000.00");
    expect(row?.totalPaid).toBe("400.00");
    expect(row?.totalOutstanding).toBe("600.00");
  });
});
