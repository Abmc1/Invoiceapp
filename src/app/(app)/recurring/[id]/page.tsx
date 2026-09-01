import Link from "next/link";
import { notFound } from "next/navigation";
import { getRecurringInvoiceById } from "@/lib/services/recurring-invoices";
import { clientDisplayName } from "@/lib/services/clients";
import { formatMoney, calcInvoiceTotals, calcLineItem } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/ui/submit-button";
import { ActionForm } from "@/components/ui/action-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { InvoiceStatusBadge } from "@/components/invoices/status-badge";
import {
  setRecurringInvoiceStatusAction,
  endRecurringInvoiceAction,
  deleteRecurringInvoiceAction,
} from "../actions";

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

export default async function RecurringInvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const schedule = await getRecurringInvoiceById(id);
  if (!schedule) notFound();

  const lines = schedule.items.map((item) =>
    calcLineItem({
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: item.discount,
      taxRate: schedule.vatExempt ? 0 : item.taxRate,
    })
  );
  const totals = calcInvoiceTotals(
    schedule.items.map((item, i) => ({
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: item.discount,
      ...lines[i],
    }))
  );

  const boundPause = setRecurringInvoiceStatusAction.bind(null, schedule.id, "PAUSED");
  const boundResume = setRecurringInvoiceStatusAction.bind(null, schedule.id, "ACTIVE");
  const boundEnd = endRecurringInvoiceAction.bind(null, schedule.id);
  const boundDelete = deleteRecurringInvoiceAction.bind(null, schedule.id);
  const hasGeneratedInvoices = schedule.generatedInvoices.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl">{clientDisplayName(schedule.client)}</h1>
            <Badge variant={STATUS_VARIANT[schedule.status]}>{schedule.status}</Badge>
            {schedule.vatExempt ? <Badge variant="muted">VAT Exempt</Badge> : null}
          </div>
          <p className="text-sm text-muted-foreground">
            {FREQUENCY_LABELS[schedule.frequency]} · Started {schedule.startDate.toLocaleDateString("en-IE")}
            {schedule.endDate ? ` · Ends ${schedule.endDate.toLocaleDateString("en-IE")}` : ""}
            {schedule.status !== "ENDED" ? ` · Next invoice ${schedule.nextRunDate.toLocaleDateString("en-IE")}` : ""}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {schedule.status !== "ENDED" ? (
            <Button asChild variant="outline">
              <Link href={`/recurring/${schedule.id}/edit`}>Edit</Link>
            </Button>
          ) : null}

          {schedule.status === "ACTIVE" ? (
            <ActionForm action={boundPause} successMessage="Schedule paused.">
              <SubmitButton variant="outline" pendingText="Pausing…">
                Pause
              </SubmitButton>
            </ActionForm>
          ) : null}

          {schedule.status === "PAUSED" ? (
            <ActionForm action={boundResume} successMessage="Schedule resumed.">
              <SubmitButton variant="outline" pendingText="Resuming…">
                Resume
              </SubmitButton>
            </ActionForm>
          ) : null}

          {schedule.status !== "ENDED" ? (
            <ActionForm action={boundEnd} successMessage="Schedule ended.">
              <SubmitButton variant="destructive" pendingText="Ending…">
                End Schedule
              </SubmitButton>
            </ActionForm>
          ) : null}

          {!hasGeneratedInvoices ? (
            <form
              action={boundDelete}
              onSubmit={(e) => {
                if (!confirm("Delete this recurring invoice schedule? This cannot be undone.")) {
                  e.preventDefault();
                }
              }}
            >
              <SubmitButton variant="ghost" pendingText="Deleting…">
                Delete
              </SubmitButton>
            </form>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Template Line Items</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedule.items.map((item, i) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className="text-right">
                      {Number(item.quantity)} {item.unit}
                    </TableCell>
                    <TableCell className="text-right">{formatMoney(item.unitPrice, schedule.currency)}</TableCell>
                    <TableCell className="text-right">{formatMoney(lines[i].lineTotal, schedule.currency)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex justify-end p-5">
              <div className="w-full max-w-xs space-y-1 text-sm">
                <div className="flex justify-between border-t border-border pt-1 font-display text-base">
                  <span>Total per invoice</span>
                  <span>{formatMoney(totals.total, schedule.currency)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Generated Invoices</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {schedule.generatedInvoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">None generated yet.</p>
            ) : (
              schedule.generatedInvoices.map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between text-sm border-b border-border pb-2 last:border-0">
                  <div>
                    <Link href={`/invoices/${invoice.id}`} className="font-medium text-brand hover:underline">
                      {invoice.invoiceNumber}
                    </Link>
                    <p className="text-xs text-muted-foreground">{invoice.issueDate.toLocaleDateString("en-IE")}</p>
                  </div>
                  <InvoiceStatusBadge status={invoice.status} dueDate={invoice.dueDate} />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
