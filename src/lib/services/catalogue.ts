import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { services } from "@/db/schema";
import { recordAuditLog } from "./audit";

export type RateType = "HOURLY" | "DAILY" | "FIXED" | "CUSTOM";

export interface ServiceInput {
  name: string;
  description?: string | null;
  defaultRate: string | number;
  rateType: RateType;
  defaultTaxRate?: string | number | null;
}

export async function createService(input: ServiceInput, userId: string) {
  const [service] = await db
    .insert(services)
    .values({
      name: input.name,
      description: input.description ?? null,
      defaultRate: String(input.defaultRate),
      rateType: input.rateType,
      defaultTaxRate: input.defaultTaxRate === null || input.defaultTaxRate === undefined ? null : String(input.defaultTaxRate),
    })
    .returning();

  await recordAuditLog(db, {
    userId,
    entityType: "service",
    entityId: service.id,
    action: "CREATED",
    newValues: { name: service.name },
  });

  return service;
}

export async function updateService(serviceId: string, input: ServiceInput, userId: string) {
  const [updated] = await db
    .update(services)
    .set({
      name: input.name,
      description: input.description ?? null,
      defaultRate: String(input.defaultRate),
      rateType: input.rateType,
      defaultTaxRate: input.defaultTaxRate === null || input.defaultTaxRate === undefined ? null : String(input.defaultTaxRate),
      updatedAt: new Date(),
    })
    .where(eq(services.id, serviceId))
    .returning();

  await recordAuditLog(db, {
    userId,
    entityType: "service",
    entityId: serviceId,
    action: "UPDATED",
    newValues: { name: updated.name },
  });

  return updated;
}

export async function setServiceActive(serviceId: string, active: boolean, userId: string) {
  const [updated] = await db
    .update(services)
    .set({ active, updatedAt: new Date() })
    .where(eq(services.id, serviceId))
    .returning();

  await recordAuditLog(db, {
    userId,
    entityType: "service",
    entityId: serviceId,
    action: active ? "REACTIVATED" : "ARCHIVED",
  });

  return updated;
}

export async function listServices(includeArchived = false) {
  const rows = await db.select().from(services).orderBy(desc(services.createdAt));
  return includeArchived ? rows : rows.filter((s) => s.active);
}

export async function getServiceById(serviceId: string) {
  const [service] = await db.select().from(services).where(eq(services.id, serviceId)).limit(1);
  return service ?? null;
}
