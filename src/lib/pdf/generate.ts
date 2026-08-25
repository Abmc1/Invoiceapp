import "server-only";
import { renderToBuffer } from "@react-pdf/renderer";
import { InvoiceDocument } from "./InvoiceDocument";
import { getInvoiceById, isInvoiceOverdue } from "@/lib/services/invoices";
import { getCompanySettings } from "@/lib/services/settings";

export async function generateInvoicePdf(invoiceId: string): Promise<{ buffer: Buffer; filename: string }> {
  const invoice = await getInvoiceById(invoiceId);
  if (!invoice) throw new Error("Invoice not found.");

  const settings = await getCompanySettings();
  const displayStatus = isInvoiceOverdue(invoice) ? "OVERDUE" : invoice.status;

  const buffer = await renderToBuffer(
    InvoiceDocument({
      settings,
      client: invoice.client,
      invoice,
      items: invoice.items,
      payments: invoice.payments,
      displayStatus,
    })
  );

  return { buffer, filename: `${invoice.invoiceNumber}.pdf` };
}
