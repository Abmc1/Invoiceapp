import Link from "next/link";
import { listRecurringInvoices } from "@/lib/services/recurring-invoices";
import { clientDisplayName } from "@/lib/services/clients";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RunRecurringNowButton } from "@/components/recurring/run-recurring-now-button";

const FREQUENCY_LABELS: Record<string, string> = {
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  YEARLY: "Yearly",
};

const STATUS_VARIANT: Record<string, "success" | "warning" | "muted"> = {
  ACTIVE: "success",
  PAUSED: "warning",
  ENDED: "muted",
};

export default async function RecurringInvoicesPage() {
  const rows = await listRecurringInvoices();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl">Recurring Invoices</h1>
          <p className="text-sm text-muted-foreground">
            Retainer or ongoing-client schedules that generate a draft invoice automatically — nothing is emailed
            until you review and send it yourself.
          </p>
        </div>
        <div className="flex gap-2">
          <RunRecurringNowButton />
          <Button asChild>
            <Link href="/recurring/new">New Recurring Invoice</Link>
          </Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Client</TableHead>
            <TableHead>Frequency</TableHead>
            <TableHead>Started</TableHead>
            <TableHead>Next Invoice</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                No recurring invoices set up yet.
              </TableCell>
            </TableRow>
          ) : (
            rows.map(({ schedule, client }) => (
              <TableRow key={schedule.id}>
                <TableCell>
                  <Link href={`/recurring/${schedule.id}`} className="font-medium text-brand hover:underline">
                    {clientDisplayName(client)}
                  </Link>
                </TableCell>
                <TableCell>{FREQUENCY_LABELS[schedule.frequency]}</TableCell>
                <TableCell>{schedule.startDate.toLocaleDateString("en-IE")}</TableCell>
                <TableCell>
                  {schedule.status === "ENDED" ? "—" : schedule.nextRunDate.toLocaleDateString("en-IE")}
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[schedule.status]}>{schedule.status}</Badge>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
