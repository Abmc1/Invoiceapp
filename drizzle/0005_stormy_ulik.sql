CREATE TYPE "public"."recurring_frequency" AS ENUM('WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY');--> statement-breakpoint
CREATE TYPE "public"."recurring_invoice_status" AS ENUM('ACTIVE', 'PAUSED', 'ENDED');--> statement-breakpoint
CREATE TABLE "recurring_invoice_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recurring_invoice_id" uuid NOT NULL,
	"service_id" uuid,
	"description" text NOT NULL,
	"quantity" numeric(12, 2) DEFAULT '1' NOT NULL,
	"unit" text DEFAULT 'unit' NOT NULL,
	"unit_price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"discount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"tax_rate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recurring_invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"frequency" "recurring_frequency" NOT NULL,
	"start_date" timestamp with time zone NOT NULL,
	"next_run_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone,
	"currency" varchar(3) DEFAULT 'EUR' NOT NULL,
	"payment_terms_days" integer DEFAULT 14 NOT NULL,
	"payment_terms" text,
	"notes" text,
	"vat_exempt" boolean DEFAULT false NOT NULL,
	"vat_exempt_reason" text,
	"status" "recurring_invoice_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "source_recurring_invoice_id" uuid;--> statement-breakpoint
ALTER TABLE "recurring_invoice_items" ADD CONSTRAINT "recurring_invoice_items_recurring_invoice_id_recurring_invoices_id_fk" FOREIGN KEY ("recurring_invoice_id") REFERENCES "public"."recurring_invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_invoice_items" ADD CONSTRAINT "recurring_invoice_items_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_invoices" ADD CONSTRAINT "recurring_invoices_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_invoices" ADD CONSTRAINT "recurring_invoices_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "recurring_invoice_items_recurring_invoice_id_idx" ON "recurring_invoice_items" USING btree ("recurring_invoice_id");--> statement-breakpoint
CREATE INDEX "recurring_invoices_client_id_idx" ON "recurring_invoices" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "recurring_invoices_next_run_date_idx" ON "recurring_invoices" USING btree ("next_run_date");--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_source_recurring_invoice_id_recurring_invoices_id_fk" FOREIGN KEY ("source_recurring_invoice_id") REFERENCES "public"."recurring_invoices"("id") ON DELETE set null ON UPDATE no action;