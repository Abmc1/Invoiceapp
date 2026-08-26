import Link from "next/link";
import { notFound } from "next/navigation";
import { getInvoiceById, isInvoiceOverdue, daysOverdue } from "@/lib/services/invoices";
import { clientDisplayName } from "@/lib/services/clients";
import { formatMoney } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/ui/submit-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { InvoiceStatusBadge } from "@/components/invoices/status-badge";
import { RecordPaymentDialog } from "@/components/invoices/record-payment-dialog";
import { VoidInvoiceDialog } from "@/components/invoices/void-invoice-dialog";
import { EmailInvoiceButton } from "@/components/invoices/email-invoice-button";
import { DeleteDraftButton } from "@/components/invoices/delete-draft-button";
import {
  finalizeInvoiceAction,
  voidInvoiceAction,
  createReplacementInvoiceAction,
  deleteDraftInvoiceAction,
  recordPaymentAction,
} from "../actions";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invoice = await getInvoiceById(id);
  if (!invoice) notFound();

  const overdue = isInvoiceOverdue(invoice);
  const boundFinalize = finalizeInvoiceAction.bind(null, invoice.id);
  const boundVoid = voidInvoiceAction.bind(null, invoice.id);
  const boundReplace = createReplacementInvoiceAction.bind(null, invoice.id);
  const boundDelete = deleteDraftInvoiceAction.bind(null, invoice.id);
  const boundRecordPayment = recordPaymentAction.bind(null, invoice.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl">{invoice.invoiceNumber}</h1>
            <InvoiceStatusBadge status={invoice.status} dueDate={invoice.dueDate} />
            {invoice.vatExempt ? <Badge variant="muted">VAT Exempt</Badge> : null}
          </div>
          <p className="text-sm text-muted-foreground">
            <Link href={`/clients/${invoice.client.id}`} className="text-brand hover:underline">
              {clientDisplayName(invoice.client)}
            </Link>
            {" · "}Issued {invoice.issueDate.toLocaleDateString("en-IE")} · Due {invoice.dueDate.toLocaleDateString("en-IE")}
            {overdue ? <span className="text-danger"> · {daysOverdue(invoice.dueDate)} days overdue</span> : null}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={`/invoices/${invoice.id}/preview`}>Preview</Link>
          </Button>
          <Button asChild variant="outline">
            <a href={`/api/invoices/${invoice.id}/pdf`} target="_blank" rel="noopener noreferrer">
              Download PDF
            </a>
          </Button>

          {invoice.status === "DRAFT" ? (
            <>
              <Button asChild variant="outline">
                <Link href={`/invoices/${invoice.id}/edit`}>Edit</Link>
              </Button>
              <form action={boundFinalize}>
                <SubmitButton pendingText="Marking as Sent…">Mark as Sent</SubmitButton>
              </form>
              <DeleteDraftButton action={boundDelete} />
            </>
          ) : null}

          {invoice.status === "SENT" || invoice.status === "PARTIALLY_PAID" ? (
            <RecordPaymentDialog action={boundRecordPayment} amountDue={invoice.amountDue} />
          ) : null}

          {invoice.status !== "DRAFT" && invoice.status !== "VOID" && invoice.status !== "CANCELLED" ? (
            <VoidInvoiceDialog action={boundVoid} />
          ) : null}

          {invoice.status === "VOID" ? (
            <form action={boundReplace}>
              <SubmitButton pendingText="Creating…">Create Replacement</SubmitButton>
            </form>
          ) : null}
        </div>
      </div>

      {invoice.status !== "DRAFT" ? <EmailInvoiceButton invoiceId={invoice.id} /> : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Line Items</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Tax</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className="text-right">
                      {Number(item.quantity)} {item.unit}
                    </TableCell>
                    <TableCell className="text-right">{formatMoney(item.unitPrice, invoice.currency)}</TableCell>
                    <TableCell className="text-right">{Number(item.taxRate) > 0 ? `${Number(item.taxRate)}%` : "—"}</TableCell>
                    <TableCell className="text-right">{formatMoney(item.lineTotal, invoice.currency)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex justify-end p-5">
              <div className="w-full max-w-xs space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatMoney(invoice.subtotal, invoice.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Discount</span>
                  <span>-{formatMoney(invoice.discountTotal, invoice.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax {invoice.vatExempt ? "(Exempt)" : ""}</span>
                  <span>{formatMoney(invoice.taxTotal, invoice.currency)}</span>
                </div>
                {invoice.vatExempt && invoice.vatExemptReason ? (
                  <p className="text-xs text-muted-foreground italic">{invoice.vatExemptReason}</p>
                ) : null}
                <div className="flex justify-between border-t border-border pt-1 font-display text-base">
                  <span>Total</span>
                  <span>{formatMoney(invoice.total, invoice.currency)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Amount Paid</span>
                  <span>{formatMoney(invoice.amountPaid, invoice.currency)}</span>
                </div>
                <div className="flex justify-between font-semibold text-brand">
                  <span>Amount Due</span>
                  <span>{formatMoney(invoice.amountDue, invoice.currency)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {invoice.payments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
              ) : (
                invoice.payments.map((p) => (
                  <div key={p.id} className="flex justify-between text-sm border-b border-border pb-2 last:border-0">
                    <div>
                      <p>{p.paymentDate.toLocaleDateString("en-IE")}</p>
                      <p className="text-muted-foreground text-xs">{p.paymentMethod.replace("_", " ")}{p.reference ? ` · ${p.reference}` : ""}</p>
                    </div>
                    <span className="font-medium">{formatMoney(p.amount, invoice.currency)}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {invoice.events.map((event) => (
                <div key={event.id} className="text-xs text-muted-foreground flex justify-between">
                  <span>{event.eventType.replace("_", " ")}</span>
                  <span>{event.createdAt.toLocaleString("en-IE")}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {invoice.notes ? (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-line">{invoice.notes}</p>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
