import "server-only";
import { and, desc, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { invoices } from "@/db/schema";
import { toCsv, type CsvColumn } from "@/lib/csv";
import { clientDisplayName } from "./clients";
import { listClients } from "./clients";
import { listPayments } from "./payments";

export async function exportClientsCsv(): Promise<string> {
  const rows = await listClients({ includeArchived: true });
  const columns: CsvColumn<(typeof rows)[number]>[] = [
    { header: "Client Type", value: (r) => r.clientType },
    { header: "Name", value: (r) => clientDisplayName(r) },
    { header: "Email", value: (r) => r.email },
    { header: "Phone", value: (r) => r.phone },
    { header: "Billing Address 1", value: (r) => r.billingAddressLine1 },
    { header: "Billing Address 2", value: (r) => r.billingAddressLine2 },
    { header: "City", value: (r) => r.billingCity },
    { header: "County", value: (r) => r.billingCounty },
    { header: "Postcode", value: (r) => r.billingPostcode },
    { header: "Country", value: (r) => r.billingCountry },
    { header: "Tax Number", value: (r) => r.taxNumber },
    { header: "Active", value: (r) => (r.active ? "Yes" : "No") },
    { header: "Created", value: (r) => r.createdAt.toISOString().slice(0, 10) },
  ];
  return toCsv(rows, columns);
}

export async function exportInvoicesCsv(range?: { from?: Date; to?: Date }): Promise<string> {
  const conditions = [];
  if (range?.from) conditions.push(gte(invoices.issueDate, range.from));
  if (range?.to) conditions.push(lte(invoices.issueDate, range.to));

  const rows = await db.query.invoices.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    with: { client: true },
    orderBy: desc(invoices.issueDate),
  });

  const columns: CsvColumn<(typeof rows)[number]>[] = [
    { header: "Invoice Number", value: (r) => r.invoiceNumber },
    { header: "Client", value: (r) => clientDisplayName(r.client) },
    { header: "Issue Date", value: (r) => r.issueDate.toISOString().slice(0, 10) },
    { header: "Due Date", value: (r) => r.dueDate.toISOString().slice(0, 10) },
    { header: "Status", value: (r) => r.status },
    { header: "Currency", value: (r) => r.currency },
    { header: "Subtotal", value: (r) => r.subtotal },
    { header: "Discount", value: (r) => r.discountTotal },
    { header: "Tax", value: (r) => r.taxTotal },
    { header: "Total", value: (r) => r.total },
    { header: "Amount Paid", value: (r) => r.amountPaid },
    { header: "Amount Due", value: (r) => r.amountDue },
  ];
  return toCsv(rows, columns);
}

export async function exportPaymentsCsv(): Promise<string> {
  const rows = await listPayments(10000);
  const columns: CsvColumn<(typeof rows)[number]>[] = [
    { header: "Payment Date", value: (r) => r.paymentDate.toISOString().slice(0, 10) },
    { header: "Invoice Number", value: (r) => r.invoice.invoiceNumber },
    { header: "Client", value: (r) => clientDisplayName(r.invoice.client) },
    { header: "Amount", value: (r) => r.amount },
    { header: "Method", value: (r) => r.paymentMethod },
    { header: "Reference", value: (r) => r.reference },
    { header: "Notes", value: (r) => r.notes },
  ];
  return toCsv(rows, columns);
}

/**
 * Accounting-friendly export: one row per invoice with the fields an
 * accountant needs (net/tax/gross, payment status, payment date & reference)
 * for a given date range. This does not replace bookkeeping software — it
 * makes it fast to hand records to an accountant.
 */
export async function exportAccountingCsv(range: { from: Date; to: Date }): Promise<string> {
  const rows = await db.query.invoices.findMany({
    where: and(gte(invoices.issueDate, range.from), lte(invoices.issueDate, range.to)),
    with: { client: true, payments: true },
    orderBy: desc(invoices.issueDate),
  });

  const columns: CsvColumn<(typeof rows)[number]>[] = [
    { header: "Invoice Number", value: (r) => r.invoiceNumber },
    { header: "Client", value: (r) => clientDisplayName(r.client) },
    { header: "Invoice Date", value: (r) => r.issueDate.toISOString().slice(0, 10) },
    { header: "Due Date", value: (r) => r.dueDate.toISOString().slice(0, 10) },
    { header: "Net Amount", value: (r) => r.subtotal },
    { header: "Tax", value: (r) => r.taxTotal },
    { header: "Gross Amount", value: (r) => r.total },
    { header: "Payment Status", value: (r) => r.status },
    {
      header: "Last Payment Date",
      value: (r) => {
        const last = [...r.payments].sort((a, b) => b.paymentDate.getTime() - a.paymentDate.getTime())[0];
        return last ? last.paymentDate.toISOString().slice(0, 10) : "";
      },
    },
    {
      header: "Payment Reference(s)",
      value: (r) => r.payments.map((p) => p.reference).filter(Boolean).join("; "),
    },
  ];
  return toCsv(rows, columns);
}
