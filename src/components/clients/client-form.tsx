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
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="clientType">Client Type</Label>
          <Select id="clientType" name="clientType" defaultValue={defaultValues?.clientType ?? "BUSINESS"} required>
            <option value="BUSINESS">Business</option>
            <option value="ORGANISATION">Organisation</option>
            <option value="INDIVIDUAL">Individual</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" defaultValue={defaultValues?.email ?? ""} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="companyName">Company / Organisation Name</Label>
          <Input id="companyName" name="companyName" defaultValue={defaultValues?.companyName ?? ""} />
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
        <legend className="text-sm font-medium mb-1">Billing Address</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input name="billingAddressLine1" placeholder="Address line 1" defaultValue={defaultValues?.billingAddressLine1 ?? ""} />
          <Input name="billingAddressLine2" placeholder="Address line 2" defaultValue={defaultValues?.billingAddressLine2 ?? ""} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Input name="billingCity" placeholder="City" defaultValue={defaultValues?.billingCity ?? ""} />
          <Input name="billingCounty" placeholder="County" defaultValue={defaultValues?.billingCounty ?? ""} />
          <Input name="billingPostcode" placeholder="Postcode" defaultValue={defaultValues?.billingPostcode ?? ""} />
        </div>
        <Input name="billingCountry" placeholder="Country" defaultValue={defaultValues?.billingCountry ?? "Ireland"} />
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

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={3} defaultValue={defaultValues?.notes ?? ""} />
      </div>

      <SubmitButton pendingText="Saving…">{submitLabel}</SubmitButton>
    </form>
  );
}
