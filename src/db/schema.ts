import {
  pgTable,
  pgEnum,
  uuid,
  text,
  varchar,
  numeric,
  integer,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const userRoleEnum = pgEnum("user_role", ["ADMIN", "USER"]);

export const clientTypeEnum = pgEnum("client_type", [
  "INDIVIDUAL",
  "BUSINESS",
  "ORGANISATION",
]);

export const rateTypeEnum = pgEnum("rate_type", [
  "HOURLY",
  "DAILY",
  "FIXED",
  "CUSTOM",
]);

export const invoiceStatusEnum = pgEnum("invoice_status", [
  "DRAFT",
  "SENT",
  "PARTIALLY_PAID",
  "PAID",
  "OVERDUE",
  "VOID",
  "CANCELLED",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "BANK_TRANSFER",
  "CASH",
  "CARD",
  "OTHER",
]);

export const invoiceEventTypeEnum = pgEnum("invoice_event_type", [
  "CREATED",
  "UPDATED",
  "FINALISED",
  "SENT",
  "VIEWED",
  "PAYMENT_RECORDED",
  "PDF_GENERATED",
  "VOIDED",
  "REMINDER_SENT",
]);

// ---------------------------------------------------------------------------
// Users & sessions
// ---------------------------------------------------------------------------

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull().default("USER"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("users_email_unique").on(sql`lower(${table.email})`),
]);

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("sessions_user_id_idx").on(table.userId),
]);

/**
 * Email-delivered one-time login codes (2FA, second factor after password).
 * Codes are stored hashed, single-use (consumedAt), short-lived, and track
 * failed verification attempts so a code can be locked out independently of
 * the broader in-memory rate limiter.
 */
export const loginOtpCodes = pgTable("login_otp_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  codeHash: text("code_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  attempts: integer("attempts").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("login_otp_codes_user_id_idx").on(table.userId),
]);

// ---------------------------------------------------------------------------
// Company settings (single row, MotivAction's business/invoice configuration)
// ---------------------------------------------------------------------------

export const companySettings = pgTable("company_settings", {
  id: uuid("id").primaryKey().defaultRandom(),

  companyName: text("company_name").notNull().default("MotivAction"),
  tradingName: text("trading_name"),
  addressLine1: text("address_line_1"),
  addressLine2: text("address_line_2"),
  city: text("city"),
  county: text("county"),
  postcode: text("postcode"),
  country: text("country").notNull().default("Ireland"),

  email: text("email"),
  phone: text("phone"),
  mobile: text("mobile"),
  website: text("website"),

  vatRegistered: boolean("vat_registered").notNull().default(false),
  vatNumber: text("vat_number"),
  companyRegistrationNumber: text("company_registration_number"),

  defaultCurrency: varchar("default_currency", { length: 3 }).notNull().default("EUR"),
  defaultPaymentTermsDays: integer("default_payment_terms_days").notNull().default(14),
  defaultTaxRate: numeric("default_tax_rate", { precision: 5, scale: 2 }).notNull().default("0"),

  invoicePrefix: varchar("invoice_prefix", { length: 10 }).notNull().default("MA"),
  invoiceNumberFormat: text("invoice_number_format").notNull().default("{PREFIX}-{YEAR}-{SEQ:4}"),
  nextInvoiceNumber: integer("next_invoice_number").notNull().default(1),
  invoiceNumberResetYearly: boolean("invoice_number_reset_yearly").notNull().default(true),
  lastInvoiceYear: integer("last_invoice_year"),

  logoUrl: text("logo_url"),
  invoiceFooter: text("invoice_footer"),
  paymentInstructions: text("payment_instructions"),

  bankName: text("bank_name"),
  bankAccountName: text("bank_account_name"),
  iban: text("iban"),
  bic: text("bic"),

  remindersEnabled: boolean("reminders_enabled").notNull().default(false),
  reminderBeforeDueDays: integer("reminder_before_due_days").notNull().default(3),
  reminderOnDueDate: boolean("reminder_on_due_date").notNull().default(true),
  reminderAfterDueDaysList: text("reminder_after_due_days_list").notNull().default("7,14"),

  emailProvider: text("email_provider").notNull().default("mock"),
  emailFromName: text("email_from_name").notNull().default("MotivAction"),
  emailFromAddress: text("email_from_address"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientType: clientTypeEnum("client_type").notNull().default("BUSINESS"),

  companyName: text("company_name"),
  firstName: text("first_name"),
  lastName: text("last_name"),

  email: text("email"),
  phone: text("phone"),

  billingAddressLine1: text("billing_address_line_1"),
  billingAddressLine2: text("billing_address_line_2"),
  billingCity: text("billing_city"),
  billingCounty: text("billing_county"),
  billingPostcode: text("billing_postcode"),
  billingCountry: text("billing_country").notNull().default("Ireland"),

  taxNumber: text("tax_number"),
  notes: text("notes"),
  defaultPaymentTermsDays: integer("default_payment_terms_days"),

  active: boolean("active").notNull().default(true),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("clients_company_name_idx").on(table.companyName),
  index("clients_email_idx").on(table.email),
]);

// ---------------------------------------------------------------------------
// Service catalogue
// ---------------------------------------------------------------------------

export const services = pgTable("services", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  defaultRate: numeric("default_rate", { precision: 12, scale: 2 }).notNull().default("0"),
  rateType: rateTypeEnum("rate_type").notNull().default("FIXED"),
  defaultTaxRate: numeric("default_tax_rate", { precision: 5, scale: 2 }),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Invoices
// ---------------------------------------------------------------------------

export const invoices = pgTable("invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoiceNumber: varchar("invoice_number", { length: 40 }).notNull(),

  clientId: uuid("client_id").notNull().references(() => clients.id, { onDelete: "restrict" }),

  issueDate: timestamp("issue_date", { withTimezone: true }).notNull().defaultNow(),
  dueDate: timestamp("due_date", { withTimezone: true }).notNull(),

  currency: varchar("currency", { length: 3 }).notNull().default("EUR"),
  status: invoiceStatusEnum("status").notNull().default("DRAFT"),

  subtotal: numeric("subtotal", { precision: 14, scale: 2 }).notNull().default("0"),
  discountTotal: numeric("discount_total", { precision: 14, scale: 2 }).notNull().default("0"),
  taxTotal: numeric("tax_total", { precision: 14, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 14, scale: 2 }).notNull().default("0"),
  amountPaid: numeric("amount_paid", { precision: 14, scale: 2 }).notNull().default("0"),
  amountDue: numeric("amount_due", { precision: 14, scale: 2 }).notNull().default("0"),

  notes: text("notes"),
  paymentTerms: text("payment_terms"),

  pdfPath: text("pdf_path"),

  voidReason: text("void_reason"),
  replacesInvoiceId: uuid("replaces_invoice_id"),

  sentAt: timestamp("sent_at", { withTimezone: true }),

  createdByUserId: uuid("created_by_user_id").references(() => users.id),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("invoices_invoice_number_unique").on(table.invoiceNumber),
  index("invoices_client_id_idx").on(table.clientId),
  index("invoices_status_idx").on(table.status),
  index("invoices_due_date_idx").on(table.dueDate),
]);

// ---------------------------------------------------------------------------
// Invoice line items
// ---------------------------------------------------------------------------

export const invoiceItems = pgTable("invoice_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoiceId: uuid("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
  serviceId: uuid("service_id").references(() => services.id, { onDelete: "set null" }),

  description: text("description").notNull(),
  quantity: numeric("quantity", { precision: 12, scale: 2 }).notNull().default("1"),
  unit: text("unit").notNull().default("unit"),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull().default("0"),
  discount: numeric("discount", { precision: 12, scale: 2 }).notNull().default("0"),
  taxRate: numeric("tax_rate", { precision: 5, scale: 2 }).notNull().default("0"),

  lineSubtotal: numeric("line_subtotal", { precision: 14, scale: 2 }).notNull().default("0"),
  lineTax: numeric("line_tax", { precision: 14, scale: 2 }).notNull().default("0"),
  lineTotal: numeric("line_total", { precision: 14, scale: 2 }).notNull().default("0"),

  sortOrder: integer("sort_order").notNull().default(0),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("invoice_items_invoice_id_idx").on(table.invoiceId),
]);

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoiceId: uuid("invoice_id").notNull().references(() => invoices.id, { onDelete: "restrict" }),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  paymentDate: timestamp("payment_date", { withTimezone: true }).notNull().defaultNow(),
  paymentMethod: paymentMethodEnum("payment_method").notNull().default("BANK_TRANSFER"),
  reference: text("reference"),
  notes: text("notes"),
  recordedByUserId: uuid("recorded_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("payments_invoice_id_idx").on(table.invoiceId),
]);

// ---------------------------------------------------------------------------
// Invoice events (timeline: sent, viewed, PDF generated, reminders, etc.)
// ---------------------------------------------------------------------------

export const invoiceEvents = pgTable("invoice_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoiceId: uuid("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
  eventType: invoiceEventTypeEnum("event_type").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("invoice_events_invoice_id_idx").on(table.invoiceId),
]);

// ---------------------------------------------------------------------------
// Audit log (financial record of important changes)
// ---------------------------------------------------------------------------

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  action: text("action").notNull(),
  oldValues: jsonb("old_values"),
  newValues: jsonb("new_values"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("audit_logs_entity_idx").on(table.entityType, table.entityId),
]);

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  auditLogs: many(auditLogs),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const loginOtpCodesRelations = relations(loginOtpCodes, ({ one }) => ({
  user: one(users, { fields: [loginOtpCodes.userId], references: [users.id] }),
}));

export const clientsRelations = relations(clients, ({ many }) => ({
  invoices: many(invoices),
}));

export const servicesRelations = relations(services, ({ many }) => ({
  invoiceItems: many(invoiceItems),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  client: one(clients, { fields: [invoices.clientId], references: [clients.id] }),
  items: many(invoiceItems),
  payments: many(payments),
  events: many(invoiceEvents),
  createdBy: one(users, { fields: [invoices.createdByUserId], references: [users.id] }),
}));

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, { fields: [invoiceItems.invoiceId], references: [invoices.id] }),
  service: one(services, { fields: [invoiceItems.serviceId], references: [services.id] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  invoice: one(invoices, { fields: [payments.invoiceId], references: [invoices.id] }),
}));

export const invoiceEventsRelations = relations(invoiceEvents, ({ one }) => ({
  invoice: one(invoices, { fields: [invoiceEvents.invoiceId], references: [invoices.id] }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, { fields: [auditLogs.userId], references: [users.id] }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type CompanySettings = typeof companySettings.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;
export type Service = typeof services.$inferSelect;
export type NewService = typeof services.$inferInsert;
export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;
export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type NewInvoiceItem = typeof invoiceItems.$inferInsert;
export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
export type InvoiceEvent = typeof invoiceEvents.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
