import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { companySettings } from "@/db/schema";
import { recordAuditLog } from "./audit";
import type { CompanySettings } from "@/db/schema";

/**
 * There is always exactly one company_settings row. It is created by the
 * seed script / first-run bootstrap; this getter creates a bare-defaults
 * row on the fly if, for some reason, none exists yet (e.g. a fresh
 * database that hasn't been seeded).
 */
export async function getCompanySettings(): Promise<CompanySettings> {
  const rows = await db.select().from(companySettings).limit(1);
  if (rows[0]) return rows[0];

  const [created] = await db.insert(companySettings).values({}).returning();
  return created;
}

export type CompanySettingsUpdate = Partial<
  Omit<CompanySettings, "id" | "createdAt" | "updatedAt" | "nextInvoiceNumber" | "lastInvoiceYear">
>;

export async function updateCompanySettings(update: CompanySettingsUpdate, userId: string) {
  const existing = await getCompanySettings();

  const [updated] = await db
    .update(companySettings)
    .set({ ...update, updatedAt: new Date() })
    .where(eq(companySettings.id, existing.id))
    .returning();

  await recordAuditLog(db, {
    userId,
    entityType: "company_settings",
    entityId: existing.id,
    action: "UPDATED",
    oldValues: existing,
    newValues: updated,
  });

  return updated;
}
