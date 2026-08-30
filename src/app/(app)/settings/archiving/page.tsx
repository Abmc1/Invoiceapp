import { getCompanySettings } from "@/lib/services/settings";
import { requireAdminPage } from "@/lib/auth/session";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { RunAutoArchiveButton } from "@/components/settings/run-auto-archive-button";
import { updateAutoArchiveSettingsAction } from "../actions";

export default async function ArchivingSettingsPage() {
  await requireAdminPage();
  const settings = await getCompanySettings();

  return (
    <div className="space-y-4">
      <Alert variant={settings.autoArchiveEnabled ? "success" : "warning"}>
        Automatic archiving is currently <strong>{settings.autoArchiveEnabled ? "ON" : "OFF"}</strong>. Only Paid,
        Void or Cancelled invoices are ever archived — nothing still owed is touched, and archiving never removes an
        invoice from reports or exports, only from the day-to-day worklist views.
      </Alert>

      <Card>
        <CardContent className="p-5">
          <form action={updateAutoArchiveSettingsAction} className="space-y-4">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" name="autoArchiveEnabled" defaultChecked={settings.autoArchiveEnabled} className="size-4" />
              Automatic archiving: ON
            </label>

            <div>
              <Label htmlFor="autoArchiveDays">Archive resolved invoices after this many days untouched</Label>
              <Input
                id="autoArchiveDays"
                name="autoArchiveDays"
                type="number"
                min={1}
                defaultValue={settings.autoArchiveDays}
              />
            </div>

            <Button type="submit">Save Archiving Settings</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5 space-y-3">
          <h2 className="font-medium">Manual Trigger</h2>
          <p className="text-sm text-muted-foreground">
            A daily scheduled job (Vercel Cron) calls <code>/api/cron/archive</code> automatically once this is on.
            You can also run a sweep immediately here — useful for testing.
          </p>
          <RunAutoArchiveButton />
        </CardContent>
      </Card>
    </div>
  );
}
