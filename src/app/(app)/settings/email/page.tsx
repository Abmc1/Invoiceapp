import { getCompanySettings } from "@/lib/services/settings";
import { requireAdminPage } from "@/lib/auth/session";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { updateEmailSettingsAction } from "../actions";

export default async function EmailSettingsPage() {
  await requireAdminPage();
  const settings = await getCompanySettings();
  const activeProvider = process.env.EMAIL_PROVIDER ?? "mock";

  return (
    <div className="space-y-4">
      <Alert variant={activeProvider === "mock" ? "warning" : "success"}>
        {activeProvider === "mock"
          ? "No real email provider is configured. Emails are logged to the server console instead of being sent. Set EMAIL_PROVIDER=smtp and the SMTP_* environment variables to send real email."
          : "SMTP email sending is active."}
      </Alert>

      <Card>
        <CardContent className="p-5">
          <form action={updateEmailSettingsAction} className="space-y-4">
            <div>
              <Label htmlFor="emailProvider">Provider (informational — actual selection is via EMAIL_PROVIDER env var)</Label>
              <Select id="emailProvider" name="emailProvider" defaultValue={settings.emailProvider}>
                <option value="mock">Mock (log only, development)</option>
                <option value="smtp">SMTP</option>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="emailFromName">From Name</Label>
                <Input id="emailFromName" name="emailFromName" defaultValue={settings.emailFromName} />
              </div>
              <div>
                <Label htmlFor="emailFromAddress">From Address</Label>
                <Input id="emailFromAddress" name="emailFromAddress" type="email" defaultValue={settings.emailFromAddress ?? ""} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              SMTP host, port and credentials are configured via environment variables (SMTP_HOST, SMTP_PORT, SMTP_USER,
              SMTP_PASSWORD, EMAIL_FROM) rather than stored in the database, since they are secrets.
            </p>
            <Button type="submit">Save Email Settings</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
