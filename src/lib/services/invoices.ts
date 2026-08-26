import "server-only";
import { and, desc, eq, gte, ilike, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { clients, invoiceItems, invoices } from "@/db/schema";
import { calcInvoiceTotals, calcLineItem, subMoney, toMoneyString, compareMoney } from "@/lib/money";
import { allocateInvoiceNumber } from "./invoice-numbering";
import { recordAuditLog, recordInvoiceEvent } from "./audit";

export type InvoiceStatus =
  | "DRAFT"
  | "SENT"
  | "PARTIALLY_PAID"
  | "PAID"
  | "OVERDUE"
  | "VOID"
  | "CANCELLED";

export interface LineItemDraft {
  serviceId?: string | null;
  description: string;
  quantity: string | number;
  unit: string;
  unitPrice: string | number;
  discount?: string | number;
  taxRate?: string | number;
}

export interface CreateInvoiceInput {
  clientId: string;
  issueDate: Date;
  dueDate: Date;
  currency: string;
  paymentTerms?: string | null;
  notes?: string | null;
  items: LineItemDraft[];
  createdByUserId: string;
  vatExempt?: boolean;
  vatExemptReason?: string | null;
}

/**
 * `vatExempt` is enforced here, not just in the UI form: every line item's
 * tax rate is forced to 0 regardless of what was submitted, so there's no
 * way to end up with a "VAT exempt" invoice that still charges VAT because
 * a client-side toggle didn't fire.
 */
function computeLineTotals(items: LineItemDraft[], vatExempt = false) {
  return items.map((item, index) => {
    const taxRate = vatExempt ? 0 : (item.taxRate ?? 0);
    const totals = calcLineItem({
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: item.discount ?? 0,
      taxRate,
    });
    return {
      serviceId: item.serviceId ?? null,
      description: item.description,
      quantity: toMoneyString(item.quantity),
      unit: item.unit || "unit",
      unitPrice: toMoneyString(item.unitPrice),
      discount: toMoneyString(item.discount ?? 0),
      taxRate: toMoneyString(taxRate),
      lineSubtotal: totals.lineSubtotal,
      lineTax: totals.lineTax,
      lineTotal: totals.lineTotal,
      sortOrder: index,
    };
  });
}

/** Creates a new DRAFT invoice with its line items, atomically allocating the invoice number. */
export async function createInvoice(input: CreateInvoiceInput) {
  if (input.items.length === 0) {
    throw new Error("An invoice must have at least one line item.");
  }

  return db.transaction(async (tx) => {
    const invoiceNumber = await allocateInvoiceNumber(tx);
    const lines = computeLineTotals(input.items, input.vatExempt);
    const totals = calcInvoiceTotals(lines);

    const [invoice] = await tx
      .insert(invoices)
      .values({
        invoiceNumber,
        clientId: input.clientId,
        issueDate: input.issueDate,
        dueDate: input.dueDate,
        currency: input.currency,
        status: "DRAFT",
        subtotal: totals.subtotal,
        discountTotal: totals.discountTotal,
        taxTotal: totals.taxTotal,
        total: totals.total,
        amountPaid: "0.00",
        amountDue: totals.total,
        notes: input.notes ?? null,
        paymentTerms: input.paymentTerms ?? null,
        vatExempt: input.vatExempt ?? false,
        vatExemptReason: input.vatExemptReason ?? null,
        createdByUserId: input.createdByUserId,
      })
      .returning();

    if (lines.length > 0) {
      await tx.insert(invoiceItems).values(lines.map((l) => ({ ...l, invoiceId: invoice.id })));
    }

    await recordInvoiceEvent(tx, invoice.id, "CREATED", { invoiceNumber });
    await recordAuditLog(tx, {
      userId: input.createdByUserId,
      entityType: "invoice",
      entityId: invoice.id,
      action: "CREATED",
      newValues: { invoiceNumber, total: totals.total, status: "DRAFT" },
    });

    return invoice;
  });
}

export interface UpdateInvoiceInput {
  clientId: string;
  issueDate: Date;
  dueDate: Date;
  currency: string;
  paymentTerms?: string | null;
  notes?: string | null;
  items: LineItemDraft[];
  updatedByUserId: string;
  vatExempt?: boolean;
  vatExemptReason?: string | null;
}

/**
 * Updates a DRAFT invoice's fields and replaces its line items, recalculating
 * totals. Finalised invoices (anything past DRAFT) are immutable — this is
 * enforced here, not just in the UI, so the financial record can't be
 * silently altered after it has been sent.
 */
export async function updateDraftInvoice(invoiceId: string, input: UpdateInvoiceInput) {
  if (input.items.length === 0) {
    throw new Error("An invoice must have at least one line item.");
  }

  return db.transaction(async (tx) => {
    const [existing] = await tx.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1);
    if (!existing) throw new Error("Invoice not found.");
    if (existing.status !== "DRAFT") {
      throw new Error("Only draft invoices can be edited. Void this invoice and create a replacement instead.");
    }

    const lines = computeLineTotals(input.items, input.vatExempt);
    const totals = calcInvoiceTotals(lines);

    const [updated] = await tx
      .update(invoices)
      .set({
        clientId: input.clientId,
        issueDate: input.issueDate,
        dueDate: input.dueDate,
        currency: input.currency,
        paymentTerms: input.paymentTerms ?? null,
        notes: input.notes ?? null,
        subtotal: totals.subtotal,
        discountTotal: totals.discountTotal,
        taxTotal: totals.taxTotal,
        total: totals.total,
        amountDue: subMoney(totals.total, existing.amountPaid).toFixed(2),
        vatExempt: input.vatExempt ?? false,
        vatExemptReason: input.vatExemptReason ?? null,
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, invoiceId))
      .returning();

    await tx.delete(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));
    await tx.insert(invoiceItems).values(lines.map((l) => ({ ...l, invoiceId })));

    await recordInvoiceEvent(tx, invoiceId, "UPDATED", {});
    await recordAuditLog(tx, {
      userId: input.updatedByUserId,
      entityType: "invoice",
      entityId: invoiceId,
      action: "UPDATED",
      oldValues: { total: existing.total },
      newValues: { total: totals.total },
    });

    return updated;
  });
}

/** Finalises a draft invoice, transitioning it to SENT. This is the point at which it becomes immutable. */
export async function finalizeInvoice(invoiceId: string, userId: string) {
  return db.transaction(async (tx) => {
    const [existing] = await tx.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1);
    if (!existing) throw new Error("Invoice not found.");
    if (existing.status !== "DRAFT") {
      throw new Error("Only draft invoices can be finalised.");
    }

    const isZeroTotal = compareMoney(existing.total, 0) === 0;

    const [updated] = await tx
      .update(invoices)
      .set({
        status: isZeroTotal ? "PAID" : "SENT",
        sentAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, invoiceId))
      .returning();

    await recordInvoiceEvent(tx, invoiceId, "FINALISED", {});
    await recordInvoiceEvent(tx, invoiceId, "SENT", { method: "marked-as-sent" });
    await recordAuditLog(tx, {
      userId,
      entityType: "invoice",
      entityId: invoiceId,
      action: "FINALISED",
      oldValues: { status: "DRAFT" },
      newValues: { status: updated.status },
    });

    return updated;
  });
}

export async function voidInvoice(invoiceId: string, userId: string, reason: string) {
  return db.transaction(async (tx) => {
    const [existing] = await tx.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1);
    if (!existing) throw new Error("Invoice not found.");
    if (existing.status === "VOID" || existing.status === "CANCELLED") {
      throw new Error("Invoice is already void.");
    }

    const [updated] = await tx
      .update(invoices)
      .set({ status: "VOID", voidReason: reason, updatedAt: new Date() })
      .where(eq(invoices.id, invoiceId))
      .returning();

    await recordInvoiceEvent(tx, invoiceId, "VOIDED", { reason });
    await recordAuditLog(tx, {
      userId,
      entityType: "invoice",
      entityId: invoiceId,
      action: "VOIDED",
      oldValues: { status: existing.status },
      newValues: { status: "VOID", reason },
    });

    return updated;
  });
}

/** Creates a new DRAFT invoice pre-filled from a voided invoice's line items, linked via replacesInvoiceId. */
export async function createReplacementInvoice(originalInvoiceId: string, userId: string) {
  const original = await db.query.invoices.findFirst({
    where: eq(invoices.id, originalInvoiceId),
    with: { items: true },
  });
  if (!original) throw new Error("Original invoice not found.");

  const today = new Date();
  const dueDate = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);

  const created = await createInvoice({
    clientId: original.clientId,
    issueDate: today,
    dueDate,
    currency: original.currency,
    paymentTerms: original.paymentTerms,
    notes: `Replaces voided invoice ${original.invoiceNumber}.`,
    items: original.items.map((item) => ({
      serviceId: item.serviceId,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
      discount: item.discount,
      taxRate: item.taxRate,
    })),
    vatExempt: original.vatExempt,
    vatExemptReason: original.vatExemptReason,
    createdByUserId: userId,
  });

  const [updated] = await db
    .update(invoices)
    .set({ replacesInvoiceId: originalInvoiceId })
    .where(eq(invoices.id, created.id))
    .returning();

  return updated;
}

export async function markInvoiceViewed(invoiceId: string) {
  await recordInvoiceEvent(db, invoiceId, "VIEWED", {});
}

export async function markPdfGenerated(invoiceId: string, pdfPath: string) {
  await db.transaction(async (tx) => {
    await tx.update(invoices).set({ pdfPath }).where(eq(invoices.id, invoiceId));
    await recordInvoiceEvent(tx, invoiceId, "PDF_GENERATED", {});
  });
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export interface InvoiceListFilters {
  status?: InvoiceStatus | "OVERDUE" | "ALL";
  search?: string;
  clientId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

/**
 * Overdue is a *derived* state, not a persisted one: an invoice is overdue
 * when it isn't paid/void/cancelled and its due date has passed. Computing
 * it at query time means it's always correct without a background job.
 */
const overdueExpr = sql<boolean>`${invoices.status} in ('SENT','PARTIALLY_PAID') and ${invoices.dueDate} < now()`;

export async function listInvoices(filters: InvoiceListFilters = {}) {
  const conditions = [];

  if (filters.status && filters.status !== "ALL") {
    if (filters.status === "OVERDUE") {
      conditions.push(overdueExpr);
    } else {
      conditions.push(eq(invoices.status, filters.status));
    }
  }
  if (filters.clientId) conditions.push(eq(invoices.clientId, filters.clientId));
  if (filters.dateFrom) conditions.push(gte(invoices.issueDate, filters.dateFrom));
  if (filters.dateTo) conditions.push(lte(invoices.issueDate, filters.dateTo));
  if (filters.search) {
    const term = `%${filters.search}%`;
    conditions.push(
      or(
        ilike(invoices.invoiceNumber, term),
        ilike(clients.companyName, term),
        ilike(clients.firstName, term),
        ilike(clients.lastName, term),
        ilike(clients.email, term)
      )
    );
  }

  const rows = await db
    .select({
      invoice: invoices,
      client: clients,
      isOverdue: overdueExpr,
    })
    .from(invoices)
    .innerJoin(clients, eq(invoices.clientId, clients.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(invoices.issueDate));

  return rows;
}

export async function getInvoiceById(invoiceId: string) {
  const invoice = await db.query.invoices.findFirst({
    where: eq(invoices.id, invoiceId),
    with: {
      client: true,
      items: { orderBy: (item, { asc }) => asc(item.sortOrder) },
      payments: { orderBy: (p, { desc }) => desc(p.paymentDate) },
      events: { orderBy: (e, { desc }) => desc(e.createdAt) },
    },
  });
  return invoice ?? null;
}

export function isInvoiceOverdue(invoice: { status: string; dueDate: Date }): boolean {
  return (invoice.status === "SENT" || invoice.status === "PARTIALLY_PAID") && invoice.dueDate.getTime() < Date.now();
}

export function daysOverdue(dueDate: Date): number {
  const diffMs = Date.now() - dueDate.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

export async function listOverdueInvoices() {
  const rows = await db
    .select({ invoice: invoices, client: clients })
    .from(invoices)
    .innerJoin(clients, eq(invoices.clientId, clients.id))
    .where(overdueExpr)
    .orderBy(invoices.dueDate);

  return rows.sort((a, b) => a.invoice.dueDate.getTime() - b.invoice.dueDate.getTime());
}

export async function deleteDraftInvoice(invoiceId: string, userId: string) {
  return db.transaction(async (tx) => {
    const [existing] = await tx.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1);
    if (!existing) throw new Error("Invoice not found.");
    if (existing.status !== "DRAFT") {
      throw new Error("Only draft invoices can be deleted. Void finalised invoices instead.");
    }
    await tx.delete(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));
    await tx.delete(invoices).where(eq(invoices.id, invoiceId));
    await recordAuditLog(tx, {
      userId,
      entityType: "invoice",
      entityId: invoiceId,
      action: "DELETED_DRAFT",
      oldValues: { invoiceNumber: existing.invoiceNumber },
    });
  });
}
