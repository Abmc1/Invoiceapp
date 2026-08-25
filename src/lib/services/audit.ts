import "server-only";
import { auditLogs, invoiceEvents } from "@/db/schema";
import type { DbOrTx } from "./types";

export async function recordAuditLog(
  tx: DbOrTx,
  params: {
    userId: string | null;
    entityType: string;
    entityId: string;
    action: string;
    oldValues?: unknown;
    newValues?: unknown;
  }
): Promise<void> {
  await tx.insert(auditLogs).values({
    userId: params.userId,
    entityType: params.entityType,
    entityId: params.entityId,
    action: params.action,
    oldValues: params.oldValues ?? null,
    newValues: params.newValues ?? null,
  });
}

export type InvoiceEventType =
  | "CREATED"
  | "UPDATED"
  | "FINALISED"
  | "SENT"
  | "VIEWED"
  | "PAYMENT_RECORDED"
  | "PDF_GENERATED"
  | "VOIDED"
  | "REMINDER_SENT";

export async function recordInvoiceEvent(
  tx: DbOrTx,
  invoiceId: string,
  eventType: InvoiceEventType,
  metadata?: Record<string, unknown>
): Promise<void> {
  await tx.insert(invoiceEvents).values({
    invoiceId,
    eventType,
    metadata: metadata ?? null,
  });
}
