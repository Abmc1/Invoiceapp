import { listClients, clientDisplayName } from "@/lib/services/clients";
import { listServices } from "@/lib/services/catalogue";
import { getCompanySettings } from "@/lib/services/settings";
import { RecurringInvoiceForm } from "@/components/recurring/recurring-invoice-form";
import { createRecurringInvoiceAction } from "../actions";

export default async function NewRecurringInvoicePage() {
  const [clients, services, settings] = await Promise.all([listClients(), listServices(), getCompanySettings()]);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-display text-2xl">New Recurring Invoice</h1>
        <p className="text-sm text-muted-foreground">
          Generates a new draft invoice automatically on the schedule below — you still review and send each one
          yourself.
        </p>
      </div>

      <RecurringInvoiceForm
        action={createRecurringInvoiceAction}
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
        submitLabel="Create Recurring Invoice"
      />
    </div>
  );
}
