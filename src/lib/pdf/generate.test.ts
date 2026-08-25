import { describe, it, expect } from "vitest";
import { seedTestCompanySettings, seedTestUser, seedTestClient } from "@/test/db";
import { createInvoice, finalizeInvoice } from "@/lib/services/invoices";
import { generateInvoicePdf } from "./generate";

describe("PDF generation", () => {
  it("generates a valid PDF buffer for an invoice", async () => {
    await seedTestCompanySettings();
    const user = await seedTestUser();
    const client = await seedTestClient();

    const invoice = await createInvoice({
      clientId: client.id,
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 14 * 86400000),
      currency: "EUR",
      items: [{ description: "Executive Coaching", quantity: 2, unit: "session", unitPrice: 250, taxRate: 23 }],
      createdByUserId: user.id,
    });
    await finalizeInvoice(invoice.id, user.id);

    const { buffer, filename } = await generateInvoicePdf(invoice.id);

    expect(filename).toBe(`${invoice.invoiceNumber}.pdf`);
    expect(buffer.length).toBeGreaterThan(500);
    // PDF files always start with the %PDF- magic header.
    expect(buffer.subarray(0, 5).toString("utf-8")).toBe("%PDF-");
  });
});
