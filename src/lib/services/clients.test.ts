import { describe, it, expect } from "vitest";
import { seedTestUser } from "@/test/db";
import { createClient, updateClient, setClientActive, listClients, clientDisplayName, getClientSummary } from "./clients";
import { createInvoice, finalizeInvoice } from "./invoices";
import { recordPayment } from "./payments";
import { seedTestCompanySettings } from "@/test/db";

describe("clients", () => {
  it("creates, updates and archives a client", async () => {
    const user = await seedTestUser();

    const client = await createClient(
      { clientType: "BUSINESS", companyName: "Acme Ltd", email: "acme@example.test" },
      user.id
    );
    expect(client.active).toBe(true);
    expect(clientDisplayName(client)).toBe("Acme Ltd");

    const updated = await updateClient(client.id, { clientType: "BUSINESS", companyName: "Acme Group Ltd" }, user.id);
    expect(updated.companyName).toBe("Acme Group Ltd");

    const archived = await setClientActive(client.id, false, user.id);
    expect(archived.active).toBe(false);

    const activeOnly = await listClients();
    expect(activeOnly.find((c) => c.id === client.id)).toBeUndefined();

    const withArchived = await listClients({ includeArchived: true });
    expect(withArchived.find((c) => c.id === client.id)).toBeDefined();
  });

  it("formats individual vs business display names correctly", () => {
    expect(
      clientDisplayName({ clientType: "INDIVIDUAL", companyName: null, firstName: "Jane", lastName: "Doe" })
    ).toBe("Jane Doe");
    expect(
      clientDisplayName({ clientType: "BUSINESS", companyName: "Acme Ltd", firstName: null, lastName: null })
    ).toBe("Acme Ltd");
  });

  it("summarises a client's invoiced, paid and outstanding totals", async () => {
    const user = await seedTestUser();
    await seedTestCompanySettings();
    const client = await createClient({ clientType: "BUSINESS", companyName: "Beta Corp" }, user.id);

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

    const summary = await getClientSummary(client.id);
    expect(summary?.totalInvoiced).toBe(1000);
    expect(summary?.totalPaid).toBe(400);
    expect(summary?.totalOutstanding).toBe(600);
  });
});
