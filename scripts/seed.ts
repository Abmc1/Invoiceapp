// Env vars are loaded via the `--env-file` flag in package.json's db:seed
// script (Node 20.6+ native support), not an in-code dotenv import — see
// the comment in scripts/migrate.ts for why that ordering matters here.
import { db } from "@/db";
import { companySettings, users } from "@/db/schema";
import { hashPassword } from "@/lib/auth/password";
import { createClient } from "@/lib/services/clients";
import { createService } from "@/lib/services/catalogue";
import { createInvoice, finalizeInvoice } from "@/lib/services/invoices";
import { recordPayment } from "@/lib/services/payments";

async function main() {
  console.log("Seeding MotivAction Invoicing database...\n");
  console.log("NOTE: this creates DEVELOPMENT ONLY sample data with fictional clients.\n");

  // 1. Company settings (real MotivAction public details; VAT/bank left blank
  //    for the administrator to fill in via Settings — never assumed).
  const [existingSettings] = await db.select().from(companySettings).limit(1);
  const settings =
    existingSettings ??
    (
      await db
        .insert(companySettings)
        .values({
          companyName: "MotivAction",
          addressLine1: "Unit 15d, Euro Business Park",
          city: "Little Island",
          county: "Cork",
          postcode: "T45 K302",
          country: "Ireland",
          email: "info@motivaction.ie",
          website: "https://motivaction.ie",
          defaultCurrency: "EUR",
          defaultPaymentTermsDays: 14,
          defaultTaxRate: "0",
          invoicePrefix: "MA",
          invoiceNumberFormat: "{PREFIX}-{YEAR}-{SEQ:4}",
          nextInvoiceNumber: 1,
          invoiceFooter: "Thank you for your business. MotivAction — It all comes down to Motivation & Action.",
          remindersEnabled: false,
        })
        .returning()
    )[0];
  console.log(`Company settings: ${settings.companyName} (${settings.city}, ${settings.county})`);

  // 2. Admin user (development credentials only)
  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? "a.burkemccarthy@motivaction.ie").toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";
  const adminName = process.env.SEED_ADMIN_NAME ?? "Audrey Burke McCarthy";

  const existingAdmin = await db.query.users.findFirst({ where: (u, { eq }) => eq(u.email, adminEmail) });

  let adminUserId: string;
  if (existingAdmin) {
    adminUserId = existingAdmin.id;
    console.log(`Admin user already exists: ${adminEmail}`);
  } else {
    const passwordHash = await hashPassword(adminPassword);
    const [admin] = await db
      .insert(users)
      .values({ name: adminName, email: adminEmail, passwordHash, role: "ADMIN" })
      .returning();
    adminUserId = admin.id;
    console.log(`Created admin user: ${adminEmail} / ${adminPassword}  (DEVELOPMENT ONLY — change this password)`);
  }

  // 3. Services — MotivAction's real service lines, with example (fictional,
  //    fully editable) default rates.
  const serviceDefs = [
    { name: "Leadership & Executive Coaching", description: "1:1 executive coaching sessions.", defaultRate: "250", rateType: "HOURLY" as const },
    { name: "Business Coaching", description: "Coaching for business owners and entrepreneurs.", defaultRate: "200", rateType: "HOURLY" as const },
    { name: "Workshops & Facilitation", description: "Facilitated team/strategy workshops.", defaultRate: "1200", rateType: "DAILY" as const },
    { name: "Training", description: "Customised in-house or online training programmes.", defaultRate: "1000", rateType: "DAILY" as const },
    { name: "Organisation Development", description: "OD consulting engagements.", defaultRate: "950", rateType: "DAILY" as const },
    { name: "Emotional Intelligence / EQ-i Assessment", description: "EQ-i assessment and debrief.", defaultRate: "450", rateType: "FIXED" as const },
    { name: "Return to Work Post Maternity Leave Programme", description: "Support programme for returning parents.", defaultRate: "600", rateType: "FIXED" as const },
    { name: "LEGO® SERIOUS PLAY®", description: "LEGO® SERIOUS PLAY® facilitated session.", defaultRate: "1100", rateType: "DAILY" as const },
    { name: "Tailored Solution", description: "Bespoke organisational solution — scoped per engagement.", defaultRate: "0", rateType: "CUSTOM" as const },
  ];

  const serviceIds: Record<string, string> = {};
  for (const def of serviceDefs) {
    const existing = await db.query.services.findFirst({ where: (s, { eq }) => eq(s.name, def.name) });
    if (existing) {
      serviceIds[def.name] = existing.id;
      continue;
    }
    const service = await createService(def, adminUserId);
    serviceIds[def.name] = service.id;
  }
  console.log(`Services: ${serviceDefs.length} in catalogue.`);

  // 4. Fictional demo clients (NOT real MotivAction clients)
  const clientDefs = [
    {
      clientType: "BUSINESS" as const,
      companyName: "Harborview Financial Services Ltd",
      firstName: "Niamh",
      lastName: "Kelly",
      email: "niamh.kelly@harborview-demo.ie",
      billingAddressLine1: "12 Quayside Business Centre",
      billingCity: "Cork",
      billingCounty: "Cork",
      billingPostcode: "T12 A1B2",
    },
    {
      clientType: "ORGANISATION" as const,
      companyName: "Riverside Credit Union",
      firstName: "Tom",
      lastName: "Brennan",
      email: "tom.brennan@riverside-demo.ie",
      billingAddressLine1: "8 Main Street",
      billingCity: "Midleton",
      billingCounty: "Cork",
      billingPostcode: "P25 X1Y2",
    },
    {
      clientType: "BUSINESS" as const,
      companyName: "Lantern Tech Solutions",
      firstName: "Sarah",
      lastName: "O'Connor",
      email: "sarah.oconnor@lantern-demo.ie",
      billingAddressLine1: "Unit 4, Innovation Park",
      billingCity: "Cork",
      billingCounty: "Cork",
      billingPostcode: "T23 C4D5",
    },
    {
      clientType: "INDIVIDUAL" as const,
      firstName: "Mark",
      lastName: "Fitzgerald",
      email: "mark.fitzgerald@example-demo.ie",
      billingCity: "Cork",
      billingCounty: "Cork",
    },
  ];

  const clientIds: string[] = [];
  for (const def of clientDefs) {
    const existing = await db.query.clients.findFirst({
      where: (c, { eq }) => (def.email ? eq(c.email, def.email) : eq(c.companyName, def.companyName ?? "")),
    });
    if (existing) {
      clientIds.push(existing.id);
      continue;
    }
    const client = await createClient(def, adminUserId);
    clientIds.push(client.id);
  }
  console.log(`Clients: ${clientDefs.length} demo clients.`);

  // 5. Example invoices covering every status the app supports.
  const [harborview, riverside, lantern, mark] = clientIds;

  async function makeInvoice(
    clientId: string,
    daysAgoIssued: number,
    termsDays: number,
    items: Array<{ name: string; qty: number; price: number; tax?: number }>
  ) {
    const issueDate = new Date(Date.now() - daysAgoIssued * 86400000);
    const dueDate = new Date(issueDate.getTime() + termsDays * 86400000);
    return createInvoice({
      clientId,
      issueDate,
      dueDate,
      currency: "EUR",
      items: items.map((i) => ({
        serviceId: serviceIds[i.name],
        description: i.name,
        quantity: i.qty,
        unit: "session",
        unitPrice: i.price,
        taxRate: i.tax ?? 0,
      })),
      createdByUserId: adminUserId,
    });
  }

  // DRAFT — not yet finalised
  await makeInvoice(harborview, 1, 14, [{ name: "Leadership & Executive Coaching", qty: 3, price: 250 }]);

  // SENT — finalised, not yet due
  const sentInvoice = await makeInvoice(lantern, 5, 30, [{ name: "Workshops & Facilitation", qty: 1, price: 1200 }]);
  await finalizeInvoice(sentInvoice.id, adminUserId);

  // PAID — finalised and paid in full
  const paidInvoice = await makeInvoice(riverside, 40, 14, [{ name: "Training", qty: 2, price: 1000 }]);
  await finalizeInvoice(paidInvoice.id, adminUserId);
  await recordPayment({
    invoiceId: paidInvoice.id,
    amount: "2000.00",
    paymentDate: new Date(),
    paymentMethod: "BANK_TRANSFER",
    reference: "DEMO-PAY-1",
    recordedByUserId: adminUserId,
  });

  // PARTIALLY_PAID — finalised, part-paid
  const partialInvoice = await makeInvoice(mark, 20, 14, [{ name: "Business Coaching", qty: 4, price: 200 }]);
  await finalizeInvoice(partialInvoice.id, adminUserId);
  await recordPayment({
    invoiceId: partialInvoice.id,
    amount: "400.00",
    paymentDate: new Date(),
    paymentMethod: "CARD",
    reference: "DEMO-PAY-2",
    recordedByUserId: adminUserId,
  });

  // OVERDUE (derived) — finalised long ago, short terms, never paid
  const overdueInvoice = await makeInvoice(harborview, 45, 14, [{ name: "Organisation Development", qty: 1, price: 950 }]);
  await finalizeInvoice(overdueInvoice.id, adminUserId);

  console.log("Invoices: 5 example invoices created (DRAFT, SENT, PAID, PARTIALLY_PAID, OVERDUE).");
  console.log("\nSeed complete.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
