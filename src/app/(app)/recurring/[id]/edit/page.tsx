import { notFound, redirect } from "next/navigation";
import { getRecurringInvoiceById } from "@/lib/services/recurring-invoices";
import { listClients, clientDisplayName } from "@/lib/services/clients";
import { listServices } from "@/lib/services/catalogue";
import { getCompanySettings } from "@/lib/services/settings";
import { RecurringInvoiceForm } from "@/components/recurring/recurring-invoice-form";
import { updateRecurringInvoiceAction } from "../../actions";

export default async function EditRecurringInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const schedule = await getRecurringInvoiceById(id);
  if (!schedule) notFound();
  if (schedule.status === "ENDED") redirect(`/recurring/${id}`);

  const [clients, services, settings] = await Promise.all([listClients(), listServices(), getCompanySettings()]);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-display text-2xl">Edit Recurring Invoice</h1>
        <p className="text-sm text-muted-foreground">
          Changes apply from the next generated invoice onward — invoices already created are never altered.
        </p>
      </div>

      <RecurringInvoiceForm
        action={updateRecurringInvoiceAction.bind(null, schedule.id)}
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
          clientId: schedule.clientId,
          frequency: schedule.frequency,
          startDate: schedule.startDate.toISOString().slice(0, 10),
          endDate: schedule.endDate ? schedule.endDate.toISOString().slice(0, 10) : "",
          currency: schedule.currency,
          paymentTermsDays: String(schedule.paymentTermsDays),
          paymentTerms: schedule.paymentTerms ?? "",
          notes: schedule.notes ?? "",
          vatExempt: schedule.vatExempt,
          vatExemptReason: schedule.vatExemptReason ?? "",
          items: schedule.items.map((item) => ({
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
