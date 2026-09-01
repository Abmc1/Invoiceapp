"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import {
  createRecurringInvoice,
  updateRecurringInvoice,
  setRecurringInvoiceStatus,
  endRecurringInvoice,
  deleteRecurringInvoice,
  runDueRecurringInvoices,
  type RecurringFrequency,
} from "@/lib/services/recurring-invoices";
import type { LineItemDraft } from "@/lib/services/invoices";

const lineItemSchema = z.object({
  serviceId: z.string().nullable().optional(),
  description: z.string().trim().min(1, "Description is required"),
  quantity: z.union([z.string(), z.number()]),
  unit: z.string().trim().min(1).default("unit"),
  unitPrice: z.union([z.string(), z.number()]),
  discount: z.union([z.string(), z.number()]).optional(),
  taxRate: z.union([z.string(), z.number()]).optional(),
});

const scheduleFormSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  frequency: z.enum(["WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"]),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().trim().optional(),
  currency: z.string().length(3),
  paymentTermsDays: z.string().min(1),
  paymentTerms: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  itemsJson: z.string().min(1),
  vatExempt: z.string().optional(),
  vatExemptReason: z.string().trim().optional(),
});

function parseScheduleForm(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = scheduleFormSchema.parse(raw);

  let items: LineItemDraft[];
  try {
    const rawItems = JSON.parse(parsed.itemsJson);
    items = z.array(lineItemSchema).parse(rawItems);
  } catch {
    throw new Error("Invalid line items.");
  }

  const paymentTermsDays = Number(parsed.paymentTermsDays);
  if (!Number.isFinite(paymentTermsDays) || paymentTermsDays < 0) {
    throw new Error("Payment terms must be a non-negative number of days.");
  }

  return {
    clientId: parsed.clientId,
    frequency: parsed.frequency as RecurringFrequency,
    startDate: new Date(parsed.startDate),
    endDate: parsed.endDate ? new Date(parsed.endDate) : null,
    currency: parsed.currency,
    paymentTermsDays,
    paymentTerms: parsed.paymentTerms || null,
    notes: parsed.notes || null,
    vatExempt: parsed.vatExempt === "on",
    vatExemptReason: parsed.vatExemptReason || null,
    items,
  };
}

export async function createRecurringInvoiceAction(formData: FormData) {
  const user = await requireUser();
  const input = parseScheduleForm(formData);

  const schedule = await createRecurringInvoice({ ...input, createdByUserId: user.id });
  revalidatePath("/recurring");
  redirect(`/recurring/${schedule.id}`);
}

export async function updateRecurringInvoiceAction(scheduleId: string, formData: FormData) {
  const user = await requireUser();
  const input = parseScheduleForm(formData);

  await updateRecurringInvoice(scheduleId, { ...input, updatedByUserId: user.id });
  revalidatePath("/recurring");
  revalidatePath(`/recurring/${scheduleId}`);
  redirect(`/recurring/${scheduleId}`);
}

export async function setRecurringInvoiceStatusAction(scheduleId: string, status: "ACTIVE" | "PAUSED") {
  const user = await requireUser();
  await setRecurringInvoiceStatus(scheduleId, status, user.id);
  revalidatePath("/recurring");
  revalidatePath(`/recurring/${scheduleId}`);
}

export async function endRecurringInvoiceAction(scheduleId: string) {
  const user = await requireUser();
  await endRecurringInvoice(scheduleId, user.id);
  revalidatePath("/recurring");
  revalidatePath(`/recurring/${scheduleId}`);
}

export async function deleteRecurringInvoiceAction(scheduleId: string) {
  const user = await requireUser();
  await deleteRecurringInvoice(scheduleId, user.id);
  revalidatePath("/recurring");
  redirect("/recurring");
}

export async function runRecurringInvoicesNowAction() {
  await requireUser();
  const result = await runDueRecurringInvoices();
  revalidatePath("/recurring");
  revalidatePath("/invoices");
  revalidatePath("/dashboard");
  return result;
}
