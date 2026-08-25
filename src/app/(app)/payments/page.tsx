import Link from "next/link";
import { listPayments } from "@/lib/services/payments";
import { clientDisplayName } from "@/lib/services/clients";
import { formatMoney } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function PaymentsPage() {
  const payments = await listPayments();
  const total = payments.reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl">Payments</h1>
          <p className="text-sm text-muted-foreground">
            {payments.length} payment(s) totalling {formatMoney(total)}
          </p>
        </div>
        <Button asChild variant="outline">
          <a href="/api/export/payments">Export CSV</a>
        </Button>
      </div>

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
    </div>
  );
}
