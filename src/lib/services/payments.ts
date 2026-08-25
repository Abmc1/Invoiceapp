import "server-only";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { invoices, payments } from "@/db/schema";
import { addMoney, compareMoney, subMoney, toMoneyString } from "@/lib/money";
import { recordAuditLog, recordInvoiceEvent } from "./audit";
import type { DbOrTx } from "./types";

export type PaymentMethod = "BANK_TRANSFER" | "CASH" | "CARD" | "OTHER";

export interface RecordPaymentInput {
  invoiceId: string;
  amount: string | number;
  paymentDate: Date;
  paymentMethod: PaymentMethod;
  reference?: string | null;
  notes?: string | null;
  recordedByUserId: string;
}

/**
 * Recomputes amount_paid / amount_due / status for an invoice from the sum
 * of its payments. Called after every payment insert/delete so the invoice
 * row is always a correct, derived reflection of its payment history rather
 * than a value that can drift out of sync.
 */
export async function recomputeInvoiceFromPayments(tx: DbOrTx, invoiceId: string) {
  const [invoice] = await tx.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1);
  if (!invoice) throw new Error("Invoice not found.");
  if (invoice.status === "VOID" || invoice.status === "CANCELLED" || invoice.status === "DRAFT") {
    return invoice;
  }

  const [{ sum }] = (await tx
    .select({ sum: sql<string>`coalesce(sum(${payments.amount}), 0)` })
    .from(payments)
    .where(eq(payments.invoiceId, invoiceId))) as { sum: string }[];

  const amountPaid = toMoneyString(sum);
  const amountDue = subMoney(invoice.total, amountPaid).toFixed(2);

  let status: typeof invoice.status = invoice.status;
  if (compareMoney(amountDue, 0) <= 0) {
    status = "PAID";
  } else if (compareMoney(amountPaid, 0) > 0) {
    status = "PARTIALLY_PAID";
  } else {
    status = "SENT";
  }

  const [updated] = await tx
    .update(invoices)
    .set({ amountPaid, amountDue, status, updatedAt: new Date() })
    .where(eq(invoices.id, invoiceId))
    .returning();

  return updated;
}

export async function recordPayment(input: RecordPaymentInput) {
  return db.transaction(async (tx) => {
    const [invoice] = await tx.select().from(invoices).where(eq(invoices.id, input.invoiceId)).limit(1);
    if (!invoice) throw new Error("Invoice not found.");
    if (invoice.status === "DRAFT") throw new Error("Cannot record a payment against a draft invoice.");
    if (invoice.status === "VOID" || invoice.status === "CANCELLED") {
      throw new Error("Cannot record a payment against a void or cancelled invoice.");
    }

    const amount = toMoneyString(input.amount);
    if (compareMoney(amount, 0) <= 0) {
      throw new Error("Payment amount must be greater than zero.");
    }

    const [payment] = await tx
      .insert(payments)
      .values({
        invoiceId: input.invoiceId,
        amount,
        paymentDate: input.paymentDate,
        paymentMethod: input.paymentMethod,
        reference: input.reference ?? null,
        notes: input.notes ?? null,
        recordedByUserId: input.recordedByUserId,
      })
      .returning();

    const updatedInvoice = await recomputeInvoiceFromPayments(tx, input.invoiceId);

    await recordInvoiceEvent(tx, input.invoiceId, "PAYMENT_RECORDED", {
      paymentId: payment.id,
      amount,
      newStatus: updatedInvoice.status,
    });
    await recordAuditLog(tx, {
      userId: input.recordedByUserId,
      entityType: "payment",
      entityId: payment.id,
      action: "CREATED",
      newValues: { invoiceId: input.invoiceId, amount, method: input.paymentMethod },
    });

    return { payment, invoice: updatedInvoice };
  });
}

export async function deletePayment(paymentId: string, userId: string) {
  return db.transaction(async (tx) => {
    const [payment] = await tx.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
    if (!payment) throw new Error("Payment not found.");

    await tx.delete(payments).where(eq(payments.id, paymentId));
    const updatedInvoice = await recomputeInvoiceFromPayments(tx, payment.invoiceId);

    await recordAuditLog(tx, {
      userId,
      entityType: "payment",
      entityId: paymentId,
      action: "DELETED",
      oldValues: { invoiceId: payment.invoiceId, amount: payment.amount },
    });

    return updatedInvoice;
  });
}

export async function listPayments(limit = 200) {
  const rows = await db.query.payments.findMany({
    orderBy: desc(payments.paymentDate),
    with: { invoice: { with: { client: true } } },
    limit,
  });
  return rows;
}

export function addPayments(a: string, b: string): string {
  return addMoney(a, b).toFixed(2);
}
