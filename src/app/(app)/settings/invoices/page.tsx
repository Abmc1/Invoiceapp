import { getCompanySettings } from "@/lib/services/settings";
import { renderInvoiceNumber } from "@/lib/services/invoice-numbering";
import { requireAdminPage } from "@/lib/auth/session";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { updateInvoiceSettingsAction } from "../actions";

export default async function InvoiceSettingsPage() {
  await requireAdminPage();
  const settings = await getCompanySettings();
  const exampleNumber = renderInvoiceNumber(settings.invoiceNumberFormat, {
    prefix: settings.invoicePrefix,
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    seq: settings.nextInvoiceNumber,
  });

  return (
    <Card>
      <CardContent className="p-5">
        <form action={updateInvoiceSettingsAction} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="invoicePrefix">Invoice Prefix</Label>
              <Input id="invoicePrefix" name="invoicePrefix" defaultValue={settings.invoicePrefix} required />
            </div>
            <div>
              <Label htmlFor="invoiceNumberFormat">Number Format</Label>
              <Input id="invoiceNumberFormat" name="invoiceNumberFormat" defaultValue={settings.invoiceNumberFormat} required />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Tokens: {"{PREFIX}"}, {"{YEAR}"}, {"{YY}"}, {"{MONTH}"}, {"{SEQ}"} / {"{SEQ:4}"} (zero-padded). Next number
            would be: <span className="font-medium text-foreground">{exampleNumber}</span>
          </p>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="invoiceNumberResetYearly" defaultChecked={settings.invoiceNumberResetYearly} className="size-4" />
            Reset numbering sequence at the start of each year
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="defaultCurrency">Default Currency</Label>
              <Select id="defaultCurrency" name="defaultCurrency" defaultValue={settings.defaultCurrency}>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="USD">USD ($)</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="defaultPaymentTermsDays">Default Payment Terms (days)</Label>
              <Input id="defaultPaymentTermsDays" name="defaultPaymentTermsDays" type="number" min={0} defaultValue={settings.defaultPaymentTermsDays} />
            </div>
          </div>

          <div>
            <Label htmlFor="defaultTaxRate">Default Tax Rate (%)</Label>
            <Input id="defaultTaxRate" name="defaultTaxRate" type="number" step="0.01" min="0" defaultValue={settings.defaultTaxRate} />
            <p className="text-xs text-muted-foreground mt-1">
              Set to 0 if MotivAction is not currently charging VAT/tax. This is only a default — every invoice line item&apos;s
              tax rate can be adjusted individually.
            </p>
          </div>

          <div>
            <Label htmlFor="paymentInstructions">Payment Instructions</Label>
            <Textarea id="paymentInstructions" name="paymentInstructions" rows={3} defaultValue={settings.paymentInstructions ?? ""} />
          </div>

          <div>
            <Label htmlFor="invoiceFooter">Invoice Footer</Label>
            <Textarea id="invoiceFooter" name="invoiceFooter" rows={2} defaultValue={settings.invoiceFooter ?? ""} />
          </div>

          <Button type="submit">Save Invoice Settings</Button>
        </form>
      </CardContent>
    </Card>
  );
}
