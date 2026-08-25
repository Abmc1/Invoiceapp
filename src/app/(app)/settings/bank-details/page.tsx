import { getCompanySettings } from "@/lib/services/settings";
import { requireAdminPage } from "@/lib/auth/session";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { updateBankDetailsAction } from "../actions";

export default async function BankDetailsSettingsPage() {
  await requireAdminPage();
  const settings = await getCompanySettings();

  return (
    <Card>
      <CardContent className="p-5">
        <Alert className="mb-4">
          These details appear on invoice PDFs so clients know how to pay. Leave blank until MotivAction&apos;s actual
          bank details are confirmed — nothing is assumed here.
        </Alert>
        <form action={updateBankDetailsAction} className="space-y-4">
          <div>
            <Label htmlFor="bankName">Bank Name</Label>
            <Input id="bankName" name="bankName" defaultValue={settings.bankName ?? ""} />
          </div>
          <div>
            <Label htmlFor="bankAccountName">Account Name</Label>
            <Input id="bankAccountName" name="bankAccountName" defaultValue={settings.bankAccountName ?? ""} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="iban">IBAN</Label>
              <Input id="iban" name="iban" defaultValue={settings.iban ?? ""} />
            </div>
            <div>
              <Label htmlFor="bic">BIC</Label>
              <Input id="bic" name="bic" defaultValue={settings.bic ?? ""} />
            </div>
          </div>
          <Button type="submit">Save Bank Details</Button>
        </form>
      </CardContent>
    </Card>
  );
}
