"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import {
  createInvoice,
  updateDraftInvoice,
  finalizeInvoice,
  voidInvoice,
  createReplacementInvoice,
  deleteDraftInvoice,
  type LineItemDraft,
} from "@/lib/services/invoices";
import { recordPayment, type PaymentMethod } from "@/lib/services/payments";
import { sendInvoiceByEmail } from "@/lib/services/invoice-email";

const lineItemSchema = z.object({
  serviceId: z.string().nullable().optional(),
  description: z.string().trim().min(1, "Description is required"),
  quantity: z.union([z.string(), z.number()]),
  unit: z.string().trim().min(1).default("unit"),
  unitPrice: z.union([z.string(), z.number()]),
  discount: z.union([z.string(), z.number()]).optional(),
  taxRate: z.union([z.string(), z.number()]).optional(),
});

const invoiceFormSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  issueDate: z.string().min(1),
  dueDate: z.string().min(1),
  currency: z.string().length(3),
  paymentTerms: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  itemsJson: z.string().min(1),
  vatExempt: z.string().optional(),
  vatExemptReason: z.string().trim().optional(),
});

const paymentFormSchema = z.object({
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Enter a valid amount (e.g. 250.00)"),
  paymentDate: z.string().min(1, "Payment date is required"),
  paymentMethod: z.enum(["BANK_TRANSFER", "CASH", "CARD", "OTHER"]),
  reference: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

function parseInvoiceForm(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = invoiceFormSchema.parse(raw);

  let items: LineItemDraft[];
  try {
    const rawItems = JSON.parse(parsed.itemsJson);
    items = z.array(lineItemSchema).parse(rawItems);
  } catch {
    throw new Error("Invalid line items.");
  }

  return {
    clientId: parsed.clientId,
    issueDate: new Date(parsed.issueDate),
    dueDate: new Date(parsed.dueDate),
    currency: parsed.currency,
    paymentTerms: parsed.paymentTerms || null,
    notes: parsed.notes || null,
    vatExempt: parsed.vatExempt === "on",
    vatExemptReason: parsed.vatExemptReason || null,
    items,
  };
}

export async function createInvoiceAction(formData: FormData) {
  const user = await requireUser();
  const input = parseInvoiceForm(formData);

  const invoice = await createInvoice({ ...input, createdByUserId: user.id });
  revalidatePath("/invoices");
  redirect(`/invoices/${invoice.id}`);
}

export async function updateInvoiceDraftAction(invoiceId: string, formData: FormData) {
  const user = await requireUser();
  const input = parseInvoiceForm(formData);

  await updateDraftInvoice(invoiceId, { ...input, updatedByUserId: user.id });
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  redirect(`/invoices/${invoiceId}`);
}

export async function finalizeInvoiceAction(invoiceId: string) {
  const user = await requireUser();
  await finalizeInvoice(invoiceId, user.id);
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
}

export async function voidInvoiceAction(invoiceId: string, formData: FormData) {
  const user = await requireUser();
  const reason = String(formData.get("reason") ?? "").trim() || "No reason given";
  await voidInvoice(invoiceId, user.id, reason);
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
}

export async function createReplacementInvoiceAction(invoiceId: string) {
  const user = await requireUser();
  const replacement = await createReplacementInvoice(invoiceId, user.id);
  revalidatePath("/invoices");
  redirect(`/invoices/${replacement.id}/edit`);
}

export async function deleteDraftInvoiceAction(invoiceId: string) {
  const user = await requireUser();
  await deleteDraftInvoice(invoiceId, user.id);
  revalidatePath("/invoices");
  redirect("/invoices");
}

export async function recordPaymentAction(invoiceId: string, formData: FormData) {
  const user = await requireUser();

  const raw = Object.fromEntries(formData.entries());
  const parsed = paymentFormSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid payment details.");
  }
  const { amount, paymentDate, paymentMethod, reference, notes } = parsed.data;

  const paymentDateValue = new Date(paymentDate);
  if (Number.isNaN(paymentDateValue.getTime())) {
    throw new Error("Enter a valid payment date.");
  }

  await recordPayment({
    invoiceId,
    amount,
    paymentDate: paymentDateValue,
    paymentMethod: paymentMethod as PaymentMethod,
    reference: reference || null,
    notes: notes || null,
    recordedByUserId: user.id,
  });

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/payments");
}

export async function sendInvoiceEmailAction(invoiceId: string) {
  const user = await requireUser();
  const result = await sendInvoiceByEmail(invoiceId, user.id);
  revalidatePath(`/invoices/${invoiceId}`);
  return result;
}
