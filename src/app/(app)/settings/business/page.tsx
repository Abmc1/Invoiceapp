import { getCompanySettings } from "@/lib/services/settings";
import { requireAdminPage } from "@/lib/auth/session";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { updateBusinessSettingsAction } from "../actions";

export default async function BusinessSettingsPage() {
  await requireAdminPage();
  const settings = await getCompanySettings();

  return (
    <Card>
      <CardContent className="p-5">
        <form action={updateBusinessSettingsAction} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="companyName">Company Name</Label>
              <Input id="companyName" name="companyName" defaultValue={settings.companyName} required />
            </div>
            <div>
              <Label htmlFor="tradingName">Trading Name</Label>
              <Input id="tradingName" name="tradingName" defaultValue={settings.tradingName ?? ""} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input name="addressLine1" placeholder="Address line 1" defaultValue={settings.addressLine1 ?? ""} />
            <Input name="addressLine2" placeholder="Address line 2" defaultValue={settings.addressLine2 ?? ""} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Input name="city" placeholder="City" defaultValue={settings.city ?? ""} />
            <Input name="county" placeholder="County" defaultValue={settings.county ?? ""} />
            <Input name="postcode" placeholder="Postcode" defaultValue={settings.postcode ?? ""} />
          </div>
          <Input name="country" placeholder="Country" defaultValue={settings.country} />

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="email">Public Email</Label>
              <Input id="email" name="email" type="email" defaultValue={settings.email ?? ""} />
            </div>
            <div>
              <Label htmlFor="website">Website</Label>
              <Input id="website" name="website" defaultValue={settings.website ?? ""} />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" defaultValue={settings.phone ?? ""} />
            </div>
            <div>
              <Label htmlFor="mobile">Mobile</Label>
              <Input id="mobile" name="mobile" defaultValue={settings.mobile ?? ""} />
            </div>
          </div>

          <fieldset className="space-y-3 rounded-md border border-border p-4">
            <legend className="text-sm font-medium px-1">Tax Registration</legend>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="vatRegistered" defaultChecked={settings.vatRegistered} className="size-4" />
              MotivAction is VAT registered
            </label>
            <p className="text-xs text-muted-foreground">
              Leave unchecked if not VAT registered — invoices will simply omit VAT. Do not assume a registration status.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="vatNumber">VAT Number {settings.vatRegistered ? "*" : ""}</Label>
                <Input id="vatNumber" name="vatNumber" defaultValue={settings.vatNumber ?? ""} required={settings.vatRegistered} />
                <p className="text-xs text-muted-foreground mt-1">Required once &quot;VAT registered&quot; is checked.</p>
              </div>
              <div>
                <Label htmlFor="companyRegistrationNumber">Company Registration No.</Label>
                <Input id="companyRegistrationNumber" name="companyRegistrationNumber" defaultValue={settings.companyRegistrationNumber ?? ""} />
              </div>
            </div>
          </fieldset>

          <Button type="submit">Save Business Details</Button>
        </form>
      </CardContent>
    </Card>
  );
}
