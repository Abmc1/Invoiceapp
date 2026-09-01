import "server-only";
import { and, asc, desc, eq, lte } from "drizzle-orm";
import { db } from "@/db";
import { clients, recurringInvoiceItems, recurringInvoices, invoices } from "@/db/schema";
import type { LineItemDraft } from "./invoices";
import { createInvoice } from "./invoices";
import { recordAuditLog } from "./audit";

export type RecurringFrequency = "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";
export type RecurringInvoiceStatus = "ACTIVE" | "PAUSED" | "ENDED";

export interface CreateRecurringInvoiceInput {
  clientId: string;
  frequency: RecurringFrequency;
  startDate: Date;
  endDate?: Date | null;
  currency: string;
  paymentTermsDays: number;
  paymentTerms?: string | null;
  notes?: string | null;
  vatExempt?: boolean;
  vatExemptReason?: string | null;
  items: LineItemDraft[];
  createdByUserId: string;
}

export type UpdateRecurringInvoiceInput = Omit<CreateRecurringInvoiceInput, "createdByUserId"> & {
  updatedByUserId: string;
};

function itemsToTemplateRows(items: LineItemDraft[]) {
  return items.map((item, index) => ({
    serviceId: item.serviceId ?? null,
    description: item.description,
    quantity: String(item.quantity),
    unit: item.unit || "unit",
    unitPrice: String(item.unitPrice),
    discount: String(item.discount ?? 0),
    taxRate: String(item.taxRate ?? 0),
    sortOrder: index,
  }));
}

/**
 * Advances a schedule date by exactly one frequency step. Uses the UTC
 * setters deliberately, not the local-time ones — `startDate`/`nextRunDate`
 * come from date-only `<input type="date">` values parsed as UTC midnight,
 * and stepping with local-time setters would silently drift by a day on any
 * host machine whose local timezone crosses a DST boundary between the two
 * dates (harmless on a server that happens to run in UTC, but wrong anywhere
 * else, including this codebase's own local dev/test environment).
 */
export function advanceByFrequency(date: Date, frequency: RecurringFrequency): Date {
  const next = new Date(date);
  switch (frequency) {
    case "WEEKLY":
      next.setUTCDate(next.getUTCDate() + 7);
      break;
    case "MONTHLY":
      next.setUTCMonth(next.getUTCMonth() + 1);
      break;
    case "QUARTERLY":
      next.setUTCMonth(next.getUTCMonth() + 3);
      break;
    case "YEARLY":
      next.setUTCFullYear(next.getUTCFullYear() + 1);
      break;
  }
  return next;
}

export async function createRecurringInvoice(input: CreateRecurringInvoiceInput) {
  if (input.items.length === 0) {
    throw new Error("A recurring invoice must have at least one line item.");
  }
  if (input.endDate && input.endDate <= input.startDate) {
    throw new Error("End date must be after the start date.");
  }

  return db.transaction(async (tx) => {
    const [schedule] = await tx
      .insert(recurringInvoices)
      .values({
        clientId: input.clientId,
        frequency: input.frequency,
        startDate: input.startDate,
        nextRunDate: input.startDate,
        endDate: input.endDate ?? null,
        currency: input.currency,
        paymentTermsDays: input.paymentTermsDays,
        paymentTerms: input.paymentTerms ?? null,
        notes: input.notes ?? null,
        vatExempt: input.vatExempt ?? false,
        vatExemptReason: input.vatExemptReason ?? null,
        createdByUserId: input.createdByUserId,
      })
      .returning();

    await tx.insert(recurringInvoiceItems).values(
      itemsToTemplateRows(input.items).map((row) => ({ ...row, recurringInvoiceId: schedule.id }))
    );

    await recordAuditLog(tx, {
      userId: input.createdByUserId,
      entityType: "recurring_invoice",
      entityId: schedule.id,
      action: "CREATED",
    });

    return schedule;
  });
}

export async function updateRecurringInvoice(id: string, input: UpdateRecurringInvoiceInput) {
  if (input.items.length === 0) {
    throw new Error("A recurring invoice must have at least one line item.");
  }
  if (input.endDate && input.endDate <= input.startDate) {
    throw new Error("End date must be after the start date.");
  }

  return db.transaction(async (tx) => {
    const [existing] = await tx.select().from(recurringInvoices).where(eq(recurringInvoices.id, id)).limit(1);
    if (!existing) throw new Error("Recurring invoice not found.");
    if (existing.status === "ENDED") throw new Error("This schedule has ended and can no longer be edited.");

    const [updated] = await tx
      .update(recurringInvoices)
      .set({
        clientId: input.clientId,
        frequency: input.frequency,
        startDate: input.startDate,
        endDate: input.endDate ?? null,
        currency: input.currency,
        paymentTermsDays: input.paymentTermsDays,
        paymentTerms: input.paymentTerms ?? null,
        notes: input.notes ?? null,
        vatExempt: input.vatExempt ?? false,
        vatExemptReason: input.vatExemptReason ?? null,
        updatedAt: new Date(),
      })
      .where(eq(recurringInvoices.id, id))
      .returning();

    await tx.delete(recurringInvoiceItems).where(eq(recurringInvoiceItems.recurringInvoiceId, id));
    await tx.insert(recurringInvoiceItems).values(
      itemsToTemplateRows(input.items).map((row) => ({ ...row, recurringInvoiceId: id }))
    );

    await recordAuditLog(tx, {
      userId: input.updatedByUserId,
      entityType: "recurring_invoice",
      entityId: id,
      action: "UPDATED",
    });

    return updated;
  });
}

export async function setRecurringInvoiceStatus(id: string, status: "ACTIVE" | "PAUSED", userId: string) {
  return db.transaction(async (tx) => {
    const [existing] = await tx.select().from(recurringInvoices).where(eq(recurringInvoices.id, id)).limit(1);
    if (!existing) throw new Error("Recurring invoice not found.");
    if (existing.status === "ENDED") throw new Error("This schedule has already ended.");

    const [updated] = await tx
      .update(recurringInvoices)
      .set({ status, updatedAt: new Date() })
      .where(eq(recurringInvoices.id, id))
      .returning();

    await recordAuditLog(tx, {
      userId,
      entityType: "recurring_invoice",
      entityId: id,
      action: status === "PAUSED" ? "PAUSED" : "RESUMED",
    });

    return updated;
  });
}

export async function endRecurringInvoice(id: string, userId: string) {
  return db.transaction(async (tx) => {
    const [existing] = await tx.select().from(recurringInvoices).where(eq(recurringInvoices.id, id)).limit(1);
    if (!existing) throw new Error("Recurring invoice not found.");

    const [updated] = await tx
      .update(recurringInvoices)
      .set({ status: "ENDED", updatedAt: new Date() })
      .where(eq(recurringInvoices.id, id))
      .returning();

    await recordAuditLog(tx, { userId, entityType: "recurring_invoice", entityId: id, action: "ENDED" });

    return updated;
  });
}

/**
 * Deletion is only allowed before the schedule has ever generated an
 * invoice — once it has, the schedule is part of the audit trail behind
 * real invoices (via invoices.sourceRecurringInvoiceId) and must be ended
 * instead, never removed outright.
 */
export async function deleteRecurringInvoice(id: string, userId: string) {
  return db.transaction(async (tx) => {
    const [generated] = await tx.select({ id: invoices.id }).from(invoices).where(eq(invoices.sourceRecurringInvoiceId, id)).limit(1);
    if (generated) {
      throw new Error("This schedule has already generated invoices — end it instead of deleting it.");
    }

    const [existing] = await tx.select().from(recurringInvoices).where(eq(recurringInvoices.id, id)).limit(1);
    if (!existing) throw new Error("Recurring invoice not found.");

    await tx.delete(recurringInvoiceItems).where(eq(recurringInvoiceItems.recurringInvoiceId, id));
    await tx.delete(recurringInvoices).where(eq(recurringInvoices.id, id));

    await recordAuditLog(tx, { userId, entityType: "recurring_invoice", entityId: id, action: "DELETED" });
  });
}

export async function listRecurringInvoices() {
  return db
    .select({ schedule: recurringInvoices, client: clients })
    .from(recurringInvoices)
    .innerJoin(clients, eq(recurringInvoices.clientId, clients.id))
    .orderBy(desc(recurringInvoices.createdAt));
}

export async function getRecurringInvoiceById(id: string) {
  const schedule = await db.query.recurringInvoices.findFirst({
    where: eq(recurringInvoices.id, id),
    with: {
      client: true,
      items: { orderBy: (item, { asc }) => asc(item.sortOrder) },
      generatedInvoices: { orderBy: (inv, { desc }) => desc(inv.issueDate) },
    },
  });
  return schedule ?? null;
}

/**
 * Generates a real invoice for every ACTIVE schedule whose nextRunDate has
 * arrived, then advances nextRunDate by one frequency step (auto-ending the
 * schedule if that step would land past its optional endDate). Advancing
 * nextRunDate happens immediately after each successful generation, which is
 * what makes re-running this sweep on the same day a no-op rather than a
 * duplicate invoice. One schedule failing (e.g. its client was deactivated)
 * is recorded and skipped rather than aborting the whole sweep.
 */
export async function runDueRecurringInvoices(): Promise<{ generated: number; ended: number; errors: string[] }> {
  const due = await db
    .select()
    .from(recurringInvoices)
    .where(and(eq(recurringInvoices.status, "ACTIVE"), lte(recurringInvoices.nextRunDate, new Date())));

  let generated = 0;
  let ended = 0;
  const errors: string[] = [];

  for (const schedule of due) {
    try {
      const items = await db
        .select()
        .from(recurringInvoiceItems)
        .where(eq(recurringInvoiceItems.recurringInvoiceId, schedule.id))
        .orderBy(asc(recurringInvoiceItems.sortOrder));

      if (items.length === 0) {
        errors.push(`Recurring invoice for schedule ${schedule.id} has no line items — skipped.`);
        continue;
      }

      const issueDate = schedule.nextRunDate;
      const dueDate = new Date(issueDate.getTime() + schedule.paymentTermsDays * 24 * 60 * 60 * 1000);

      const invoice = await createInvoice({
        clientId: schedule.clientId,
        issueDate,
        dueDate,
        currency: schedule.currency,
        paymentTerms: schedule.paymentTerms,
        notes: schedule.notes,
        items: items.map((item) => ({
          serviceId: item.serviceId,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          discount: item.discount,
          taxRate: item.taxRate,
        })),
        createdByUserId: schedule.createdByUserId,
        vatExempt: schedule.vatExempt,
        vatExemptReason: schedule.vatExemptReason,
        sourceRecurringInvoiceId: schedule.id,
      });

      const nextRunDate = advanceByFrequency(schedule.nextRunDate, schedule.frequency);
      const willEnd = Boolean(schedule.endDate && nextRunDate > schedule.endDate);

      await db
        .update(recurringInvoices)
        .set({ nextRunDate, status: willEnd ? "ENDED" : "ACTIVE", updatedAt: new Date() })
        .where(eq(recurringInvoices.id, schedule.id));

      await recordAuditLog(db, {
        userId: schedule.createdByUserId,
        entityType: "recurring_invoice",
        entityId: schedule.id,
        action: "GENERATED",
        newValues: { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber },
      });

      generated += 1;
      if (willEnd) ended += 1;
    } catch (err) {
      errors.push(`Schedule ${schedule.id}: ${err instanceof Error ? err.message : "failed to generate invoice"}`);
    }
  }

  return { generated, ended, errors };
}
