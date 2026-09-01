import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { sql } from "drizzle-orm";
import * as schema from "@/db/schema";

/**
 * In-memory PostgreSQL (via PGlite/WASM) used only for automated tests, so
 * the full test suite — including concurrency and transaction behaviour —
 * runs without requiring a real Postgres server. Production and local
 * development always use a real PostgreSQL instance (see src/db/index.ts).
 */
const client = new PGlite();
export const testDb = drizzle(client, { schema });

let migrated = false;

export async function ensureTestDbReady() {
  if (!migrated) {
    await migrate(testDb, { migrationsFolder: "./drizzle" });
    migrated = true;
  }
}

const TABLES = [
  "audit_logs",
  "invoice_events",
  "payments",
  "invoice_items",
  "invoices",
  "recurring_invoice_items",
  "recurring_invoices",
  "services",
  "clients",
  "sessions",
  "users",
  "company_settings",
] as const;

export async function resetTestDb() {
  await ensureTestDbReady();
  for (const table of TABLES) {
    await testDb.execute(sql.raw(`truncate table "${table}" cascade`));
  }
}

export async function seedTestCompanySettings(overrides: Partial<typeof schema.companySettings.$inferInsert> = {}) {
  const [row] = await testDb
    .insert(schema.companySettings)
    .values({
      companyName: "MotivAction",
      invoicePrefix: "MA",
      invoiceNumberFormat: "{PREFIX}-{YEAR}-{SEQ:4}",
      nextInvoiceNumber: 1,
      defaultCurrency: "EUR",
      ...overrides,
    })
    .returning();
  return row;
}

export async function seedTestUser(overrides: Partial<typeof schema.users.$inferInsert> = {}) {
  const [row] = await testDb
    .insert(schema.users)
    .values({
      name: "Test Admin",
      email: `admin+${Math.random().toString(36).slice(2)}@example.test`,
      passwordHash: "test-hash",
      role: "ADMIN",
      ...overrides,
    })
    .returning();
  return row;
}

export async function seedTestClient(overrides: Partial<typeof schema.clients.$inferInsert> = {}) {
  const [row] = await testDb
    .insert(schema.clients)
    .values({
      clientType: "BUSINESS",
      companyName: "Test Client Ltd",
      email: "client@example.test",
      ...overrides,
    })
    .returning();
  return row;
}
