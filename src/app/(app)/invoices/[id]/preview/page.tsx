import Link from "next/link";
import { notFound } from "next/navigation";
import { getInvoiceById } from "@/lib/services/invoices";
import { clientDisplayName } from "@/lib/services/clients";
import { getCompanySettings } from "@/lib/services/settings";
import { formatMoney } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { InvoiceStatusBadge } from "@/components/invoices/status-badge";

export default async function InvoicePreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invoice = await getInvoiceById(id);
  if (!invoice) notFound();
  const settings = await getCompanySettings();

  const addressLines = [settings.addressLine1, settings.addressLine2, [settings.city, settings.county].filter(Boolean).join(", "), settings.postcode, settings.country].filter(Boolean);
  const clientAddressLines = [
    invoice.client.billingAddressLine1,
    invoice.client.billingAddressLine2,
    [invoice.client.billingCity, invoice.client.billingCounty].filter(Boolean).join(", "),
    invoice.client.billingPostcode,
    invoice.client.billingCountry,
  ].filter(Boolean);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <Button asChild variant="outline">
          <Link href={`/invoices/${invoice.id}`}>Back to Invoice</Link>
        </Button>
        <Button asChild>
          <a href={`/api/invoices/${invoice.id}/pdf`} target="_blank" rel="noopener noreferrer">
            Download PDF
          </a>
        </Button>
      </div>

      <div className="mx-auto max-w-3xl rounded-lg border border-border bg-white p-10 shadow-sm text-[#1D1D1B]">
        <div className="flex justify-between items-start border-b border-border pb-6 mb-6">
          <div>
            <p className="font-display text-2xl" style={{ color: "#C62435" }}>
              {settings.tradingName || settings.companyName}
            </p>
            {addressLines.map((line, i) => (
              <p key={i} className="text-xs text-muted-foreground">{line}</p>
            ))}
            {settings.vatRegistered && settings.vatNumber ? <p className="text-xs text-muted-foreground">VAT No: {settings.vatNumber}</p> : null}
            {settings.email ? <p className="text-xs text-muted-foreground">{settings.email}</p> : null}
          </div>
          <div className="text-right">
            <p className="font-display text-2xl tracking-wide">INVOICE</p>
            <p className="text-sm mt-2">{invoice.invoiceNumber}</p>
            <p className="text-xs text-muted-foreground">Issued {invoice.issueDate.toLocaleDateString("en-IE")}</p>
            <p className="text-xs text-muted-foreground">Due {invoice.dueDate.toLocaleDateString("en-IE")}</p>
            <div className="mt-2">
              <InvoiceStatusBadge status={invoice.status} dueDate={invoice.dueDate} />
            </div>
          </div>
        </div>

        <div className="mb-6">
          <p className="text-xs uppercase text-muted-foreground mb-1">Bill To</p>
          <p className="font-medium">{clientDisplayName(invoice.client)}</p>
          {clientAddressLines.map((line, i) => (
            <p key={i} className="text-xs text-muted-foreground">{line}</p>
          ))}
          {invoice.client.email ? <p className="text-xs text-muted-foreground">{invoice.client.email}</p> : null}
        </div>

        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="bg-[#1D1D1B] text-white text-xs uppercase">
              <th className="text-left py-2 px-3">Description</th>
              <th className="text-right py-2 px-3">Qty</th>
              <th className="text-right py-2 px-3">Rate</th>
              <th className="text-right py-2 px-3">Tax</th>
              <th className="text-right py-2 px-3">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item) => (
              <tr key={item.id} className="border-b border-border">
                <td className="py-2 px-3">{item.description}</td>
                <td className="py-2 px-3 text-right">{Number(item.quantity)} {item.unit}</td>
                <td className="py-2 px-3 text-right">{formatMoney(item.unitPrice, invoice.currency)}</td>
                <td className="py-2 px-3 text-right">{Number(item.taxRate) > 0 ? `${Number(item.taxRate)}%` : "—"}</td>
                <td className="py-2 px-3 text-right">{formatMoney(item.lineTotal, invoice.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end mb-6">
          <div className="w-64 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatMoney(invoice.subtotal, invoice.currency)}</span></div>
            {Number(invoice.discountTotal) > 0 ? <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span>-{formatMoney(invoice.discountTotal, invoice.currency)}</span></div> : null}
            <div className="flex justify-between"><span className="text-muted-foreground">{settings.vatRegistered ? "VAT" : "Tax"}{invoice.vatExempt ? " (Exempt)" : ""}</span><span>{formatMoney(invoice.taxTotal, invoice.currency)}</span></div>
            <div className="flex justify-between border-t border-[#1D1D1B] pt-1 font-display text-base"><span>Total</span><span>{formatMoney(invoice.total, invoice.currency)}</span></div>
            {Number(invoice.amountPaid) > 0 ? <div className="flex justify-between text-muted-foreground"><span>Amount Paid</span><span>-{formatMoney(invoice.amountPaid, invoice.currency)}</span></div> : null}
            <div className="flex justify-between rounded px-2 py-1 font-semibold" style={{ backgroundColor: "#faf1f2", color: "#C62435" }}>
              <span>Amount Due</span><span>{formatMoney(invoice.amountDue, invoice.currency)}</span>
            </div>
          </div>
        </div>

        {invoice.vatExempt ? (
          <div className="mb-4">
            <p className="text-xs uppercase text-muted-foreground mb-1">VAT Exemption</p>
            <p className="text-sm">{invoice.vatExemptReason || "This invoice is exempt from VAT."}</p>
          </div>
        ) : null}

        {invoice.paymentTerms ? (
          <div className="mb-4">
            <p className="text-xs uppercase text-muted-foreground mb-1">Payment Terms</p>
            <p className="text-sm">{invoice.paymentTerms}</p>
          </div>
        ) : null}

        {settings.paymentInstructions || settings.iban ? (
          <div className="mb-4">
            <p className="text-xs uppercase text-muted-foreground mb-1">Payment Details</p>
            {settings.paymentInstructions ? <p className="text-sm whitespace-pre-line">{settings.paymentInstructions}</p> : null}
            {settings.bankName ? <p className="text-sm">Bank: {settings.bankName}</p> : null}
            {settings.iban ? <p className="text-sm">IBAN: {settings.iban}</p> : null}
            {settings.bic ? <p className="text-sm">BIC: {settings.bic}</p> : null}
          </div>
        ) : null}

        <p className="text-xs text-muted-foreground border-t border-border pt-4 mt-8 text-center">
          {settings.invoiceFooter || `${settings.companyName} · ${settings.email ?? ""}`}
        </p>
      </div>
    </div>
  );
}
