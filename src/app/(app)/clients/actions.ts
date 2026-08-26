"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { createClient, updateClient, setClientActive, type ClientInput } from "@/lib/services/clients";

const clientSchema = z.object({
  clientType: z.enum(["INDIVIDUAL", "BUSINESS", "ORGANISATION"]),
  companyName: z.string().trim().optional(),
  firstName: z.string().trim().optional(),
  lastName: z.string().trim().optional(),
  email: z.email("Enter a valid email address."),
  phone: z.string().trim().optional(),
  billingAddressLine1: z.string().trim().min(1, "Billing address is required."),
  billingAddressLine2: z.string().trim().optional(),
  billingCity: z.string().trim().min(1, "City is required."),
  billingCounty: z.string().trim().optional(),
  billingPostcode: z.string().trim().min(1, "Postcode is required."),
  billingCountry: z.string().trim().min(1, "Country is required."),
  taxNumber: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  defaultPaymentTermsDays: z.string().trim().optional(),
  vatExempt: z.string().optional(),
});

function parseClientForm(formData: FormData): ClientInput {
  const raw = Object.fromEntries(formData.entries());
  const parsed = clientSchema.parse(raw);

  if (parsed.clientType !== "INDIVIDUAL" && !parsed.companyName) {
    throw new Error("Company / organisation name is required for this client type.");
  }
  if (parsed.clientType === "INDIVIDUAL" && !parsed.firstName && !parsed.lastName) {
    throw new Error("First or last name is required for an individual client.");
  }

  return {
    clientType: parsed.clientType,
    companyName: parsed.companyName || null,
    firstName: parsed.firstName || null,
    lastName: parsed.lastName || null,
    email: parsed.email,
    phone: parsed.phone || null,
    billingAddressLine1: parsed.billingAddressLine1,
    billingAddressLine2: parsed.billingAddressLine2 || null,
    billingCity: parsed.billingCity,
    billingCounty: parsed.billingCounty || null,
    billingPostcode: parsed.billingPostcode,
    billingCountry: parsed.billingCountry,
    taxNumber: parsed.taxNumber || null,
    notes: parsed.notes || null,
    defaultPaymentTermsDays: parsed.defaultPaymentTermsDays ? Number(parsed.defaultPaymentTermsDays) : null,
    vatExempt: parsed.vatExempt === "on",
  };
}

export async function createClientAction(formData: FormData) {
  const user = await requireUser();
  const input = parseClientForm(formData);
  const client = await createClient(input, user.id);
  revalidatePath("/clients");
  redirect(`/clients/${client.id}`);
}

export async function updateClientAction(clientId: string, formData: FormData) {
  const user = await requireUser();
  const input = parseClientForm(formData);
  await updateClient(clientId, input, user.id);
  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}`);
}

export async function archiveClientAction(clientId: string, active: boolean) {
  const user = await requireUser();
  await setClientActive(clientId, active, user.id);
  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}`);
}
