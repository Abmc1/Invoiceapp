import { listClients, clientDisplayName } from "@/lib/services/clients";
import { listServices } from "@/lib/services/catalogue";
import { getCompanySettings } from "@/lib/services/settings";
import { InvoiceForm } from "@/components/invoices/invoice-form";
import { createInvoiceAction } from "../actions";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const initialClientId = typeof params.clientId === "string" ? params.clientId : undefined;

  const [clients, services, settings] = await Promise.all([listClients(), listServices(), getCompanySettings()]);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-display text-2xl">New Invoice</h1>
        <p className="text-sm text-muted-foreground">Totals are calculated automatically as you type.</p>
      </div>

      <InvoiceForm
        action={createInvoiceAction}
        clients={clients.map((c) => ({ id: c.id, label: clientDisplayName(c), defaultPaymentTermsDays: c.defaultPaymentTermsDays }))}
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
        initialClientId={initialClientId}
        submitLabel="Save Draft"
      />
    </div>
  );
}
