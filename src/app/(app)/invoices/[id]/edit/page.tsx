import { notFound, redirect } from "next/navigation";
import { getInvoiceById } from "@/lib/services/invoices";
import { listClients, clientDisplayName } from "@/lib/services/clients";
import { listServices } from "@/lib/services/catalogue";
import { getCompanySettings } from "@/lib/services/settings";
import { InvoiceForm } from "@/components/invoices/invoice-form";
import { updateInvoiceDraftAction } from "../../actions";

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invoice = await getInvoiceById(id);
  if (!invoice) notFound();
  if (invoice.status !== "DRAFT") redirect(`/invoices/${id}`);

  const [clients, services, settings] = await Promise.all([listClients(), listServices(), getCompanySettings()]);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-display text-2xl">Edit Invoice {invoice.invoiceNumber}</h1>
        <p className="text-sm text-muted-foreground">Draft invoices can be freely edited before finalising.</p>
      </div>

      <InvoiceForm
        action={updateInvoiceDraftAction.bind(null, invoice.id)}
        clients={clients.map((c) => ({ id: c.id, label: clientDisplayName(c), defaultPaymentTermsDays: c.defaultPaymentTermsDays, vatExempt: c.vatExempt }))}
        services={services.map((s) => ({
          id: s.id,
          name: s.name,
          defaultRate: s.defaultRate,
          rateType: s.rateType,
          defaultTaxRate: s.defaultTaxRate,
        }))}
        defaultCurrency={settings.defaultCurrency}
        defaultTaxRate={settings.defaultTaxRate}
        defaultPaymentTermsDays={settings.defaultPaymentTermsDays}
        defaultValues={{
          clientId: invoice.clientId,
          issueDate: invoice.issueDate.toISOString().slice(0, 10),
          dueDate: invoice.dueDate.toISOString().slice(0, 10),
          currency: invoice.currency,
          paymentTerms: invoice.paymentTerms ?? "",
          notes: invoice.notes ?? "",
          vatExempt: invoice.vatExempt,
          vatExemptReason: invoice.vatExemptReason ?? "",
          items: invoice.items.map((item) => ({
            serviceId: item.serviceId,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            discount: item.discount,
            taxRate: item.taxRate,
          })),
        }}
        submitLabel="Save Changes"
      />
    </div>
  );
}
