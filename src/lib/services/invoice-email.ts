import "server-only";
import { db } from "@/db";
import { getInvoiceById } from "./invoices";
import { getCompanySettings } from "./settings";
import { generateInvoicePdf } from "@/lib/pdf/generate";
import { getEmailProvider } from "@/lib/email";
import { renderInvoiceEmail } from "@/lib/email/templates";
import { clientDisplayName } from "./clients";
import { recordAuditLog, recordInvoiceEvent } from "./audit";

export async function sendInvoiceByEmail(invoiceId: string, userId: string) {
  const invoice = await getInvoiceById(invoiceId);
  if (!invoice) throw new Error("Invoice not found.");
  if (invoice.status === "DRAFT") throw new Error("Finalise the invoice before emailing it.");
  if (!invoice.client.email) throw new Error("This client has no email address on file.");

  const settings = await getCompanySettings();
  const { buffer, filename } = await generateInvoicePdf(invoiceId);

  const { subject, html, text } = renderInvoiceEmail({
    companyName: settings.tradingName || settings.companyName,
    clientName: clientDisplayName(invoice.client),
    invoiceNumber: invoice.invoiceNumber,
    total: invoice.total,
    currency: invoice.currency,
    dueDate: invoice.dueDate,
    paymentInstructions: settings.paymentInstructions,
  });

  const provider = await getEmailProvider();
  const result = await provider.send({
    to: invoice.client.email,
    subject,
    html,
    text,
    attachments: [{ filename, content: buffer, contentType: "application/pdf" }],
  });

  await db.transaction(async (tx) => {
    await recordInvoiceEvent(tx, invoiceId, "SENT", {
      method: "email",
      provider: result.provider,
      mocked: result.mocked,
      to: invoice.client.email,
    });
    await recordAuditLog(tx, {
      userId,
      entityType: "invoice",
      entityId: invoiceId,
      action: "EMAILED",
      newValues: { provider: result.provider, mocked: result.mocked },
    });
  });

  return result;
}
