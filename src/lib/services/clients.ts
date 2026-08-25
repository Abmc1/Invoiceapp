import "server-only";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { clients, invoices } from "@/db/schema";
import { recordAuditLog } from "./audit";

export type ClientType = "INDIVIDUAL" | "BUSINESS" | "ORGANISATION";

export interface ClientInput {
  clientType: ClientType;
  companyName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  billingAddressLine1?: string | null;
  billingAddressLine2?: string | null;
  billingCity?: string | null;
  billingCounty?: string | null;
  billingPostcode?: string | null;
  billingCountry?: string | null;
  taxNumber?: string | null;
  notes?: string | null;
  defaultPaymentTermsDays?: number | null;
}

export function clientDisplayName(client: {
  clientType: string;
  companyName: string | null;
  firstName: string | null;
  lastName: string | null;
}): string {
  const personName = [client.firstName, client.lastName].filter(Boolean).join(" ").trim();
  if (client.clientType === "INDIVIDUAL") {
    return personName || client.companyName || "Unnamed client";
  }
  if (client.companyName && personName) return `${client.companyName} (${personName})`;
  return client.companyName || personName || "Unnamed client";
}

export async function createClient(input: ClientInput, userId: string) {
  const [client] = await db
    .insert(clients)
    .values({ ...input, billingCountry: input.billingCountry ?? "Ireland" })
    .returning();

  await recordAuditLog(db, {
    userId,
    entityType: "client",
    entityId: client.id,
    action: "CREATED",
    newValues: { name: clientDisplayName(client) },
  });

  return client;
}

export async function updateClient(clientId: string, input: ClientInput, userId: string) {
  const [existing] = await db.select().from(clients).where(eq(clients.id, clientId)).limit(1);
  if (!existing) throw new Error("Client not found.");

  const [updated] = await db
    .update(clients)
    .set({ ...input, billingCountry: input.billingCountry ?? "Ireland", updatedAt: new Date() })
    .where(eq(clients.id, clientId))
    .returning();

  await recordAuditLog(db, {
    userId,
    entityType: "client",
    entityId: clientId,
    action: "UPDATED",
    oldValues: { name: clientDisplayName(existing) },
    newValues: { name: clientDisplayName(updated) },
  });

  return updated;
}

export async function setClientActive(clientId: string, active: boolean, userId: string) {
  const [updated] = await db
    .update(clients)
    .set({ active, updatedAt: new Date() })
    .where(eq(clients.id, clientId))
    .returning();

  await recordAuditLog(db, {
    userId,
    entityType: "client",
    entityId: clientId,
    action: active ? "REACTIVATED" : "ARCHIVED",
  });

  return updated;
}

export interface ClientListFilters {
  search?: string;
  includeArchived?: boolean;
}

export async function listClients(filters: ClientListFilters = {}) {
  const conditions = [];
  if (!filters.includeArchived) conditions.push(eq(clients.active, true));
  if (filters.search) {
    const term = `%${filters.search}%`;
    conditions.push(
      or(
        ilike(clients.companyName, term),
        ilike(clients.firstName, term),
        ilike(clients.lastName, term),
        ilike(clients.email, term)
      )
    );
  }

  return db
    .select()
    .from(clients)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(clients.createdAt));
}

export async function getClientById(clientId: string) {
  return db.query.clients.findFirst({ where: eq(clients.id, clientId) }) ?? null;
}

/** Client profile summary: totals invoiced/paid/outstanding and invoice history. */
export async function getClientSummary(clientId: string) {
  const client = await getClientById(clientId);
  if (!client) return null;

  const clientInvoices = await db
    .select()
    .from(invoices)
    .where(eq(invoices.clientId, clientId))
    .orderBy(desc(invoices.issueDate));

  const nonVoid = clientInvoices.filter((i) => i.status !== "VOID" && i.status !== "CANCELLED" && i.status !== "DRAFT");

  const totalInvoiced = nonVoid.reduce((sum, i) => sum + Number(i.total), 0);
  const totalPaid = nonVoid.reduce((sum, i) => sum + Number(i.amountPaid), 0);
  const totalOutstanding = nonVoid.reduce((sum, i) => sum + Number(i.amountDue), 0);
  const overdueCount = nonVoid.filter(
    (i) => (i.status === "SENT" || i.status === "PARTIALLY_PAID") && i.dueDate.getTime() < Date.now()
  ).length;

  const paidInvoices = nonVoid.filter((i) => i.status === "PAID" && i.sentAt);
  const avgPaymentDays =
    paidInvoices.length > 0
      ? Math.round(
          paidInvoices.reduce((sum, i) => sum + (i.updatedAt.getTime() - (i.sentAt as Date).getTime()), 0) /
            paidInvoices.length /
            (1000 * 60 * 60 * 24)
        )
      : null;

  return {
    client,
    invoices: clientInvoices,
    totalInvoiced,
    totalPaid,
    totalOutstanding,
    overdueCount,
    avgPaymentDays,
  };
}
