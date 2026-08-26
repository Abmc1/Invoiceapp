import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Client } from "@/db/schema";

export function ClientForm({
  action,
  defaultValues,
  submitLabel = "Save Client",
}: {
  action: (formData: FormData) => void | Promise<void>;
  defaultValues?: Partial<Client>;
  submitLabel?: string;
}) {
  return (
    <form action={action} className="space-y-6">
      <p className="text-xs text-muted-foreground">Fields marked * are required.</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="clientType">Client Type *</Label>
          <Select id="clientType" name="clientType" defaultValue={defaultValues?.clientType ?? "BUSINESS"} required>
            <option value="BUSINESS">Business</option>
            <option value="ORGANISATION">Organisation</option>
            <option value="INDIVIDUAL">Individual</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="email">Email *</Label>
          <Input id="email" name="email" type="email" defaultValue={defaultValues?.email ?? ""} required />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="companyName">Company / Organisation Name</Label>
          <Input id="companyName" name="companyName" defaultValue={defaultValues?.companyName ?? ""} />
          <p className="text-xs text-muted-foreground mt-1">Required for Business/Organisation clients.</p>
        </div>
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" defaultValue={defaultValues?.phone ?? ""} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="firstName">Contact First Name</Label>
          <Input id="firstName" name="firstName" defaultValue={defaultValues?.firstName ?? ""} />
        </div>
        <div>
          <Label htmlFor="lastName">Contact Last Name</Label>
          <Input id="lastName" name="lastName" defaultValue={defaultValues?.lastName ?? ""} />
        </div>
      </div>

      <fieldset className="space-y-4">
        <legend className="text-sm font-medium mb-1">Billing Address *</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="billingAddressLine1">Address line 1 *</Label>
            <Input id="billingAddressLine1" name="billingAddressLine1" defaultValue={defaultValues?.billingAddressLine1 ?? ""} required />
          </div>
          <div>
            <Label htmlFor="billingAddressLine2">Address line 2</Label>
            <Input id="billingAddressLine2" name="billingAddressLine2" defaultValue={defaultValues?.billingAddressLine2 ?? ""} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="billingCity">City *</Label>
            <Input id="billingCity" name="billingCity" defaultValue={defaultValues?.billingCity ?? ""} required />
          </div>
          <div>
            <Label htmlFor="billingCounty">County</Label>
            <Input id="billingCounty" name="billingCounty" defaultValue={defaultValues?.billingCounty ?? ""} />
          </div>
          <div>
            <Label htmlFor="billingPostcode">Postcode *</Label>
            <Input id="billingPostcode" name="billingPostcode" defaultValue={defaultValues?.billingPostcode ?? ""} required />
          </div>
        </div>
        <div>
          <Label htmlFor="billingCountry">Country *</Label>
          <Input id="billingCountry" name="billingCountry" defaultValue={defaultValues?.billingCountry ?? "Ireland"} required />
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="taxNumber">Tax / VAT Number</Label>
          <Input id="taxNumber" name="taxNumber" defaultValue={defaultValues?.taxNumber ?? ""} />
        </div>
        <div>
          <Label htmlFor="defaultPaymentTermsDays">Default Payment Terms (days)</Label>
          <Input
            id="defaultPaymentTermsDays"
            name="defaultPaymentTermsDays"
            type="number"
            min={0}
            defaultValue={defaultValues?.defaultPaymentTermsDays ?? ""}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="vatExempt" value="on" defaultChecked={defaultValues?.vatExempt ?? false} className="size-4" />
        VAT exempt — new invoices to this client default to 0% VAT (e.g. overseas client, reverse charge, exempt
        organisation). Can still be overridden per invoice.
      </label>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={3} defaultValue={defaultValues?.notes ?? ""} />
      </div>

      <SubmitButton pendingText="Saving…">{submitLabel}</SubmitButton>
    </form>
  );
}
