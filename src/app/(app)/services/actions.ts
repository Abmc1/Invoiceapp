"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { createService, updateService, setServiceActive } from "@/lib/services/catalogue";

const serviceSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  description: z.string().trim().optional(),
  defaultRate: z.string().trim().min(1, "Rate is required"),
  rateType: z.enum(["HOURLY", "DAILY", "FIXED", "CUSTOM"]),
  defaultTaxRate: z.string().trim().optional(),
});

export async function createServiceAction(formData: FormData) {
  const user = await requireUser();
  const raw = Object.fromEntries(formData.entries());
  const parsed = serviceSchema.parse(raw);

  await createService(
    {
      name: parsed.name,
      description: parsed.description || null,
      defaultRate: parsed.defaultRate,
      rateType: parsed.rateType,
      defaultTaxRate: parsed.defaultTaxRate || null,
    },
    user.id
  );
  revalidatePath("/services");
}

export async function updateServiceAction(serviceId: string, formData: FormData) {
  const user = await requireUser();
  const raw = Object.fromEntries(formData.entries());
  const parsed = serviceSchema.parse(raw);

  await updateService(
    serviceId,
    {
      name: parsed.name,
      description: parsed.description || null,
      defaultRate: parsed.defaultRate,
      rateType: parsed.rateType,
      defaultTaxRate: parsed.defaultTaxRate || null,
    },
    user.id
  );
  revalidatePath("/services");
}

export async function archiveServiceAction(serviceId: string, active: boolean) {
  const user = await requireUser();
  await setServiceActive(serviceId, active, user.id);
  revalidatePath("/services");
}
