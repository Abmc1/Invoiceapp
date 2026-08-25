import "server-only";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { clients, invoiceItems, invoices, payments, services } from "@/db/schema";

export interface DateRange {
  from?: Date;
  to?: Date;
}

function dateConditions(column: typeof invoices.issueDate | typeof payments.paymentDate, range: DateRange) {
  const conditions = [];
  if (range.from) conditions.push(gte(column, range.from));
  if (range.to) conditions.push(lte(column, range.to));
  return conditions;
}

export async function revenueByMonth(range: DateRange = {}) {
  const conditions = [
    sql`${invoices.status} in ('SENT','PARTIALLY_PAID','PAID')`,
    ...dateConditions(invoices.issueDate, range),
  ];

  const rows = await db
    .select({
      month: sql<string>`to_char(${invoices.issueDate}, 'YYYY-MM')`,
      revenue: sql<string>`coalesce(sum(${invoices.total}), 0)`,
      invoiceCount: sql<number>`count(*)`,
    })
    .from(invoices)
    .where(and(...conditions))
    .groupBy(sql`to_char(${invoices.issueDate}, 'YYYY-MM')`)
    .orderBy(sql`to_char(${invoices.issueDate}, 'YYYY-MM')`);

  return rows;
}

export async function invoicesByMonth(range: DateRange = {}) {
  const conditions = dateConditions(invoices.issueDate, range);

  const rows = await db
    .select({
      month: sql<string>`to_char(${invoices.issueDate}, 'YYYY-MM')`,
      status: invoices.status,
      count: sql<number>`count(*)`,
    })
    .from(invoices)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .groupBy(sql`to_char(${invoices.issueDate}, 'YYYY-MM')`, invoices.status)
    .orderBy(sql`to_char(${invoices.issueDate}, 'YYYY-MM')`);

  return rows;
}

export async function outstandingInvoices() {
  return db
    .select({ invoice: invoices, client: clients })
    .from(invoices)
    .innerJoin(clients, eq(invoices.clientId, clients.id))
    .where(sql`${invoices.status} in ('SENT','PARTIALLY_PAID')`)
    .orderBy(invoices.dueDate);
}

export async function paymentsReceived(range: DateRange = {}) {
  const conditions = dateConditions(payments.paymentDate, range);

  const rows = await db
    .select({
      month: sql<string>`to_char(${payments.paymentDate}, 'YYYY-MM')`,
      total: sql<string>`coalesce(sum(${payments.amount}), 0)`,
      count: sql<number>`count(*)`,
    })
    .from(payments)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .groupBy(sql`to_char(${payments.paymentDate}, 'YYYY-MM')`)
    .orderBy(sql`to_char(${payments.paymentDate}, 'YYYY-MM')`);

  return rows;
}

export async function revenueByClient(range: DateRange = {}) {
  const conditions = [
    sql`${invoices.status} in ('SENT','PARTIALLY_PAID','PAID')`,
    ...dateConditions(invoices.issueDate, range),
  ];

  const rows = await db
    .select({
      clientId: clients.id,
      clientName: sql<string>`coalesce(${clients.companyName}, trim(concat(${clients.firstName}, ' ', ${clients.lastName})))`,
      revenue: sql<string>`coalesce(sum(${invoices.total}), 0)`,
      invoiceCount: sql<number>`count(*)`,
    })
    .from(invoices)
    .innerJoin(clients, eq(invoices.clientId, clients.id))
    .where(and(...conditions))
    .groupBy(clients.id)
    .orderBy(desc(sql`sum(${invoices.total})`));

  return rows;
}

export async function revenueByService(range: DateRange = {}) {
  const conditions = [
    sql`${invoices.status} in ('SENT','PARTIALLY_PAID','PAID')`,
    ...dateConditions(invoices.issueDate, range),
  ];

  const rows = await db
    .select({
      serviceId: services.id,
      serviceName: sql<string>`coalesce(${services.name}, 'Uncategorised')`,
      revenue: sql<string>`coalesce(sum(${invoiceItems.lineTotal}), 0)`,
      lineCount: sql<number>`count(*)`,
    })
    .from(invoiceItems)
    .innerJoin(invoices, eq(invoiceItems.invoiceId, invoices.id))
    .leftJoin(services, eq(invoiceItems.serviceId, services.id))
    .where(and(...conditions))
    .groupBy(services.id)
    .orderBy(desc(sql`sum(${invoiceItems.lineTotal})`));

  return rows;
}

export async function dashboardSummary() {
  const [totals] = await db
    .select({
      totalInvoiced: sql<string>`coalesce(sum(${invoices.total}) filter (where ${invoices.status} in ('SENT','PARTIALLY_PAID','PAID')), 0)`,
      totalPaid: sql<string>`coalesce(sum(${invoices.amountPaid}) filter (where ${invoices.status} in ('SENT','PARTIALLY_PAID','PAID')), 0)`,
      totalOutstanding: sql<string>`coalesce(sum(${invoices.amountDue}) filter (where ${invoices.status} in ('SENT','PARTIALLY_PAID')), 0)`,
      totalOverdue: sql<string>`coalesce(sum(${invoices.amountDue}) filter (where ${invoices.status} in ('SENT','PARTIALLY_PAID') and ${invoices.dueDate} < now()), 0)`,
      draftCount: sql<number>`count(*) filter (where ${invoices.status} = 'DRAFT')`,
      sentCount: sql<number>`count(*) filter (where ${invoices.status} = 'SENT')`,
      paidCount: sql<number>`count(*) filter (where ${invoices.status} = 'PAID')`,
      partiallyPaidCount: sql<number>`count(*) filter (where ${invoices.status} = 'PARTIALLY_PAID')`,
      overdueCount: sql<number>`count(*) filter (where ${invoices.status} in ('SENT','PARTIALLY_PAID') and ${invoices.dueDate} < now())`,
    })
    .from(invoices);

  return totals;
}

export async function recentInvoices(limit = 8) {
  return db
    .select({ invoice: invoices, client: clients })
    .from(invoices)
    .innerJoin(clients, eq(invoices.clientId, clients.id))
    .orderBy(desc(invoices.createdAt))
    .limit(limit);
}
