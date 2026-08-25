import "server-only";
import { sql } from "drizzle-orm";
import { companySettings } from "@/db/schema";
import type { DbOrTx } from "./types";

/**
 * Renders an invoice number from the configured format string.
 * Supported tokens: {PREFIX} {YEAR} {YY} {MONTH} {SEQ} {SEQ:n} (zero-padded to n digits).
 */
export function renderInvoiceNumber(
  format: string,
  params: { prefix: string; year: number; month: number; seq: number }
): string {
  return format
    .replace(/\{PREFIX\}/g, params.prefix)
    .replace(/\{YEAR\}/g, String(params.year))
    .replace(/\{YY\}/g, String(params.year).slice(-2))
    .replace(/\{MONTH\}/g, String(params.month).padStart(2, "0"))
    .replace(/\{SEQ:(\d+)\}/g, (_m, digits: string) => String(params.seq).padStart(Number(digits), "0"))
    .replace(/\{SEQ\}/g, String(params.seq));
}

/**
 * Atomically allocates the next invoice number.
 *
 * MUST be called from within a `db.transaction()` so that the row lock
 * (`FOR UPDATE`) held on `company_settings` is released only once the
 * invoice row using this number has also been inserted in the same
 * transaction. This guarantees two concurrent invoice creations can never
 * receive the same number, even under high concurrency, because the second
 * transaction blocks on the row lock until the first commits (or rolls
 * back, in which case its increment is undone too).
 */
export async function allocateInvoiceNumber(tx: DbOrTx): Promise<string> {
  const result = await tx.execute(
    sql`select * from ${companySettings} for update limit 1`
  );
  // Different pg drivers shape execute() results differently: postgres-js
  // returns the row array directly, while node-postgres/PGlite wrap it as
  // `{ rows: [...] }`. Handle both so this works identically in production
  // (postgres-js) and in tests (PGlite).
  const rows = (Array.isArray(result) ? result : (result as { rows?: unknown[] }).rows) ?? [];
  const row = (rows as Record<string, unknown>[])[0];

  if (!row) {
    throw new Error("Company settings have not been configured yet.");
  }

  const now = new Date();
  const currentYear = now.getFullYear();

  const prefix = row.invoice_prefix as string;
  const format = row.invoice_number_format as string;
  const resetYearly = row.invoice_number_reset_yearly as boolean;
  const lastYear = row.last_invoice_year as number | null;
  let nextNumber = row.next_invoice_number as number;

  if (resetYearly && lastYear !== currentYear) {
    nextNumber = 1;
  }

  const invoiceNumber = renderInvoiceNumber(format, {
    prefix,
    year: currentYear,
    month: now.getMonth() + 1,
    seq: nextNumber,
  });

  await tx
    .update(companySettings)
    .set({
      nextInvoiceNumber: nextNumber + 1,
      lastInvoiceYear: currentYear,
      updatedAt: new Date(),
    })
    .where(sql`${companySettings.id} = ${row.id}`);

  return invoiceNumber;
}
