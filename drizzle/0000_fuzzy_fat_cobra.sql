CREATE TYPE "public"."client_type" AS ENUM('INDIVIDUAL', 'BUSINESS', 'ORGANISATION');--> statement-breakpoint
CREATE TYPE "public"."invoice_event_type" AS ENUM('CREATED', 'UPDATED', 'FINALISED', 'SENT', 'VIEWED', 'PAYMENT_RECORDED', 'PDF_GENERATED', 'VOIDED', 'REMINDER_SENT');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('DRAFT', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'VOID', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('BANK_TRANSFER', 'CASH', 'CARD', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."rate_type" AS ENUM('HOURLY', 'DAILY', 'FIXED', 'CUSTOM');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('ADMIN', 'USER');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"action" text NOT NULL,
	"old_values" jsonb,
	"new_values" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_type" "client_type" DEFAULT 'BUSINESS' NOT NULL,
	"company_name" text,
	"first_name" text,
	"last_name" text,
	"email" text,
	"phone" text,
	"billing_address_line_1" text,
	"billing_address_line_2" text,
	"billing_city" text,
	"billing_county" text,
	"billing_postcode" text,
	"billing_country" text DEFAULT 'Ireland' NOT NULL,
	"tax_number" text,
	"notes" text,
	"default_payment_terms_days" integer,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_name" text DEFAULT 'MotivAction' NOT NULL,
	"trading_name" text,
	"address_line_1" text,
	"address_line_2" text,
	"city" text,
	"county" text,
	"postcode" text,
	"country" text DEFAULT 'Ireland' NOT NULL,
	"email" text,
	"phone" text,
	"mobile" text,
	"website" text,
	"vat_registered" boolean DEFAULT false NOT NULL,
	"vat_number" text,
	"company_registration_number" text,
	"default_currency" varchar(3) DEFAULT 'EUR' NOT NULL,
	"default_payment_terms_days" integer DEFAULT 14 NOT NULL,
	"default_tax_rate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"invoice_prefix" varchar(10) DEFAULT 'MA' NOT NULL,
	"invoice_number_format" text DEFAULT '{PREFIX}-{YEAR}-{SEQ:4}' NOT NULL,
	"next_invoice_number" integer DEFAULT 1 NOT NULL,
	"invoice_number_reset_yearly" boolean DEFAULT true NOT NULL,
	"last_invoice_year" integer,
	"logo_url" text,
	"invoice_footer" text,
	"payment_instructions" text,
	"bank_name" text,
	"bank_account_name" text,
	"iban" text,
	"bic" text,
	"reminders_enabled" boolean DEFAULT false NOT NULL,
	"reminder_before_due_days" integer DEFAULT 3 NOT NULL,
	"reminder_on_due_date" boolean DEFAULT true NOT NULL,
	"reminder_after_due_days_list" text DEFAULT '7,14' NOT NULL,
	"email_provider" text DEFAULT 'mock' NOT NULL,
	"email_from_name" text DEFAULT 'MotivAction' NOT NULL,
	"email_from_address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"event_type" "invoice_event_type" NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"service_id" uuid,
	"description" text NOT NULL,
	"quantity" numeric(12, 2) DEFAULT '1' NOT NULL,
	"unit" text DEFAULT 'unit' NOT NULL,
	"unit_price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"discount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"tax_rate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"line_subtotal" numeric(14, 2) DEFAULT '0' NOT NULL,
	"line_tax" numeric(14, 2) DEFAULT '0' NOT NULL,
	"line_total" numeric(14, 2) DEFAULT '0' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_number" varchar(40) NOT NULL,
	"client_id" uuid NOT NULL,
	"issue_date" timestamp with time zone DEFAULT now() NOT NULL,
	"due_date" timestamp with time zone NOT NULL,
	"currency" varchar(3) DEFAULT 'EUR' NOT NULL,
	"status" "invoice_status" DEFAULT 'DRAFT' NOT NULL,
	"subtotal" numeric(14, 2) DEFAULT '0' NOT NULL,
	"discount_total" numeric(14, 2) DEFAULT '0' NOT NULL,
	"tax_total" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total" numeric(14, 2) DEFAULT '0' NOT NULL,
	"amount_paid" numeric(14, 2) DEFAULT '0' NOT NULL,
	"amount_due" numeric(14, 2) DEFAULT '0' NOT NULL,
	"notes" text,
	"payment_terms" text,
	"pdf_path" text,
	"void_reason" text,
	"replaces_invoice_id" uuid,
	"sent_at" timestamp with time zone,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"payment_date" timestamp with time zone DEFAULT now() NOT NULL,
	"payment_method" "payment_method" DEFAULT 'BANK_TRANSFER' NOT NULL,
	"reference" text,
	"notes" text,
	"recorded_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"default_rate" numeric(12, 2) DEFAULT '0' NOT NULL,
	"rate_type" "rate_type" DEFAULT 'FIXED' NOT NULL,
	"default_tax_rate" numeric(5, 2),
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" DEFAULT 'USER' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_events" ADD CONSTRAINT "invoice_events_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_recorded_by_user_id_users_id_fk" FOREIGN KEY ("recorded_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "clients_company_name_idx" ON "clients" USING btree ("company_name");--> statement-breakpoint
CREATE INDEX "clients_email_idx" ON "clients" USING btree ("email");--> statement-breakpoint
CREATE INDEX "invoice_events_invoice_id_idx" ON "invoice_events" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "invoice_items_invoice_id_idx" ON "invoice_items" USING btree ("invoice_id");--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_invoice_number_unique" ON "invoices" USING btree ("invoice_number");--> statement-breakpoint
CREATE INDEX "invoices_client_id_idx" ON "invoices" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "invoices_status_idx" ON "invoices" USING btree ("status");--> statement-breakpoint
CREATE INDEX "invoices_due_date_idx" ON "invoices" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "payments_invoice_id_idx" ON "payments" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree (lower("email"));