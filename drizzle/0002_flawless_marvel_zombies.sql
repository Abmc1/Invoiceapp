ALTER TABLE "clients" ADD COLUMN "vat_exempt" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "vat_exempt" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "vat_exempt_reason" text;