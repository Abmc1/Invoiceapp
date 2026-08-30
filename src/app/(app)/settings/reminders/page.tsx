import { getCompanySettings } from "@/lib/services/settings";
import { requireAdminPage } from "@/lib/auth/session";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { RunRemindersButton } from "@/components/settings/run-reminders-button";
import { updateReminderSettingsAction } from "../actions";

export default async function ReminderSettingsPage() {
  await requireAdminPage();
  const settings = await getCompanySettings();

  return (
    <div className="space-y-4">
      <Alert variant={settings.remindersEnabled ? "success" : "warning"}>
        Automated reminders are currently <strong>{settings.remindersEnabled ? "ON" : "OFF"}</strong>. No reminder
        emails are ever sent unless this is switched on.
      </Alert>

      <Card>
        <CardContent className="p-5">
          <form action={updateReminderSettingsAction} className="space-y-4">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" name="remindersEnabled" defaultChecked={settings.remindersEnabled} className="size-4" />
              Automated reminders: ON
            </label>

            <div>
              <Label htmlFor="reminderBeforeDueDays">Send reminder this many days before due date</Label>
              <Input
                id="reminderBeforeDueDays"
                name="reminderBeforeDueDays"
                type="number"
                min={0}
                defaultValue={settings.reminderBeforeDueDays}
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="reminderOnDueDate" defaultChecked={settings.reminderOnDueDate} className="size-4" />
              Send a reminder on the due date itself
            </label>

            <div>
              <Label htmlFor="reminderAfterDueDaysList">Send reminders this many days after the due date (comma-separated)</Label>
              <Input
                id="reminderAfterDueDaysList"
                name="reminderAfterDueDaysList"
                defaultValue={settings.reminderAfterDueDaysList}
                placeholder="7,14"
              />
            </div>

            <Button type="submit">Save Reminder Settings</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5 space-y-3">
          <h2 className="font-medium">Manual Trigger</h2>
          <p className="text-sm text-muted-foreground">
            A daily scheduled job (Vercel Cron) calls <code>/api/cron/reminders</code> automatically once this is on.
            You can also trigger a check immediately here — useful for testing.
          </p>
          <RunRemindersButton />
        </CardContent>
      </Card>
    </div>
  );
}
