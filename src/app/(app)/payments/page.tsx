import Link from "next/link";
import { listPayments } from "@/lib/services/payments";
import { outstandingByClient, outstandingInvoices } from "@/lib/services/reports";
import { clientDisplayName } from "@/lib/services/clients";
import { daysOverdue, isInvoiceOverdue } from "@/lib/services/invoices";
import { formatMoney } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RecordPaymentDialog } from "@/components/invoices/record-payment-dialog";
import { recordPaymentAction } from "../invoices/actions";

export default async function PaymentsPage() {
  const [payments, byClient, outstanding] = await Promise.all([
    listPayments(),
    outstandingByClient(),
    outstandingInvoices(),
  ]);
  const total = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalOutstanding = byClient.reduce((sum, c) => sum + Number(c.totalOutstanding), 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl">Payments</h1>
          <p className="text-sm text-muted-foreground">
            {payments.length} payment(s) totalling {formatMoney(total)} · {formatMoney(totalOutstanding)} outstanding
            across {byClient.length} client(s)
          </p>
        </div>
        <Button asChild variant="outline">
          <a href="/api/export/payments">Export CSV</a>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Who Owes What</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead className="text-right">Invoiced</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {byClient.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No invoiced clients yet.
                  </TableCell>
                </TableRow>
              ) : (
                byClient.map((c) => (
                  <TableRow key={c.clientId}>
                    <TableCell>
                      <Link href={`/clients/${c.clientId}`} className="font-medium text-brand hover:underline">
                        {c.clientName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right">{formatMoney(c.totalInvoiced)}</TableCell>
                    <TableCell className="text-right">{formatMoney(c.totalPaid)}</TableCell>
                    <TableCell className="text-right font-medium">{formatMoney(c.totalOutstanding)}</TableCell>
                    <TableCell>
                      {Number(c.totalOutstanding) === 0 ? (
                        <Badge variant="success">Paid Up</Badge>
                      ) : c.overdueCount > 0 ? (
                        <Badge variant="danger">{c.overdueCount} Overdue</Badge>
                      ) : (
                        <Badge variant="warning">Outstanding</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Outstanding Invoices</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-right">Amount Due</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {outstanding.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Nothing outstanding.
                  </TableCell>
                </TableRow>
              ) : (
                outstanding.map(({ invoice, client }) => (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <Link href={`/invoices/${invoice.id}`} className="font-medium text-brand hover:underline">
                        {invoice.invoiceNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="truncate max-w-[160px]">{clientDisplayName(client)}</TableCell>
                    <TableCell>
                      {invoice.dueDate.toLocaleDateString("en-IE")}
                      {isInvoiceOverdue(invoice) ? (
                        <span className="text-danger text-xs ml-1">({daysOverdue(invoice.dueDate)}d overdue)</span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right">{formatMoney(invoice.amountDue, invoice.currency)}</TableCell>
                    <TableCell className="text-right">
                      <RecordPaymentDialog action={recordPaymentAction.bind(null, invoice.id)} amountDue={invoice.amountDue} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No payments recorded yet.
                  </TableCell>
                </TableRow>
              ) : (
                payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.paymentDate.toLocaleDateString("en-IE")}</TableCell>
                    <TableCell>
                      <Link href={`/invoices/${p.invoice.id}`} className="font-medium text-brand hover:underline">
                        {p.invoice.invoiceNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="truncate max-w-[160px]">{clientDisplayName(p.invoice.client)}</TableCell>
                    <TableCell className="capitalize">{p.paymentMethod.replace("_", " ").toLowerCase()}</TableCell>
                    <TableCell>{p.reference || "—"}</TableCell>
                    <TableCell className="text-right">{formatMoney(p.amount, p.invoice.currency)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
