import {
  revenueByMonth,
  invoicesByMonth,
  paymentsReceived,
  revenueByClient,
  revenueByService,
  outstandingInvoices,
  vatReport,
} from "@/lib/services/reports";
import { clientDisplayName } from "@/lib/services/clients";
import { formatMoney } from "@/lib/money";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const from = typeof params.from === "string" && params.from ? new Date(params.from) : undefined;
  const to = typeof params.to === "string" && params.to ? new Date(params.to) : undefined;

  const [revenue, invoiceCounts, payments, byClient, byService, outstanding, vat] = await Promise.all([
    revenueByMonth({ from, to }),
    invoicesByMonth({ from, to }),
    paymentsReceived({ from, to }),
    revenueByClient({ from, to }),
    revenueByService({ from, to }),
    outstandingInvoices(),
    vatReport({ from, to }),
  ]);

  const invoicesByMonthTotals = new Map<string, number>();
  for (const row of invoiceCounts) {
    invoicesByMonthTotals.set(row.month, (invoicesByMonthTotals.get(row.month) ?? 0) + Number(row.count));
  }
  const sortedMonths = [...invoicesByMonthTotals.keys()].sort();

  const today = new Date().toISOString().slice(0, 10);
  const yearStart = `${new Date().getFullYear()}-01-01`;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl">Reports</h1>
        <p className="text-sm text-muted-foreground">Revenue, invoicing and payment activity for MotivAction.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter by Date Range</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-wrap items-end gap-3" method="get">
            <div>
              <Label htmlFor="from">From</Label>
              <Input id="from" type="date" name="from" defaultValue={typeof params.from === "string" ? params.from : yearStart} />
            </div>
            <div>
              <Label htmlFor="to">To</Label>
              <Input id="to" type="date" name="to" defaultValue={typeof params.to === "string" ? params.to : today} />
            </div>
            <Button type="submit" variant="outline">
              Apply
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>VAT Report</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Net, VAT and gross for the date range above, broken down by the rate charged — for filling in a VAT
              return. Only finalised (Sent/Partially Paid/Paid) invoices are included.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <a href={`/api/export/vat?from=${(params.from as string) || yearStart}&to=${(params.to as string) || today}`}>
              Export CSV
            </a>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tax Rate</TableHead>
                <TableHead className="text-right">Net</TableHead>
                <TableHead className="text-right">VAT</TableHead>
                <TableHead className="text-right">Gross</TableHead>
                <TableHead className="text-right">Lines</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vat.byRate.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                    No finalised invoices in this range.
                  </TableCell>
                </TableRow>
              ) : (
                vat.byRate.map((row) => (
                  <TableRow key={row.taxRate}>
                    <TableCell>{Number(row.taxRate) === 0 ? "0% / Exempt" : `${Number(row.taxRate)}%`}</TableCell>
                    <TableCell className="text-right">{formatMoney(row.net)}</TableCell>
                    <TableCell className="text-right">{formatMoney(row.vat)}</TableCell>
                    <TableCell className="text-right">{formatMoney(row.gross)}</TableCell>
                    <TableCell className="text-right">{row.lineCount}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            {vat.byRate.length > 0 ? (
              <tfoot>
                <TableRow className="font-semibold">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right">{formatMoney(vat.totals.net)}</TableCell>
                  <TableCell className="text-right">{formatMoney(vat.totals.vat)}</TableCell>
                  <TableCell className="text-right">{formatMoney(vat.totals.gross)}</TableCell>
                  <TableCell />
                </TableRow>
              </tfoot>
            ) : null}
          </Table>
          {Number(vat.exempt.invoiceCount) > 0 ? (
            <p className="px-4 py-3 text-sm text-muted-foreground border-t border-border">
              <Badge variant="muted">VAT Exempt</Badge>{" "}
              {vat.exempt.invoiceCount} invoice(s) totalling {formatMoney(vat.exempt.net)} were marked VAT exempt in
              this range and are excluded from the rate breakdown above.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Month</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Invoices</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {revenue.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">No data for this range.</TableCell></TableRow>
                ) : (
                  revenue.map((row) => (
                    <TableRow key={row.month}>
                      <TableCell>{row.month}</TableCell>
                      <TableCell className="text-right">{row.invoiceCount}</TableCell>
                      <TableCell className="text-right">{formatMoney(row.revenue)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invoices by Month</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Invoices Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedMonths.length === 0 ? (
                  <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground py-6">No data for this range.</TableCell></TableRow>
                ) : (
                  sortedMonths.map((month) => (
                    <TableRow key={month}>
                      <TableCell>{month}</TableCell>
                      <TableCell className="text-right">{invoicesByMonthTotals.get(month)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payments Received by Month</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Payments</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">No payments in this range.</TableCell></TableRow>
                ) : (
                  payments.map((row) => (
                    <TableRow key={row.month}>
                      <TableCell>{row.month}</TableCell>
                      <TableCell className="text-right">{row.count}</TableCell>
                      <TableCell className="text-right">{formatMoney(row.total)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue by Client</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-right">Invoices</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byClient.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">No data for this range.</TableCell></TableRow>
                ) : (
                  byClient.map((row) => (
                    <TableRow key={row.clientId}>
                      <TableCell>{row.clientName}</TableCell>
                      <TableCell className="text-right">{row.invoiceCount}</TableCell>
                      <TableCell className="text-right">{formatMoney(row.revenue)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue by Service</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead className="text-right">Lines</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byService.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">No data for this range.</TableCell></TableRow>
                ) : (
                  byService.map((row) => (
                    <TableRow key={row.serviceId ?? "uncategorised"}>
                      <TableCell>{row.serviceName}</TableCell>
                      <TableCell className="text-right">{row.lineCount}</TableCell>
                      <TableCell className="text-right">{formatMoney(row.revenue)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Outstanding Invoices ({outstanding.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-right">Amount Due</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {outstanding.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">Nothing outstanding.</TableCell></TableRow>
              ) : (
                outstanding.map(({ invoice, client }) => (
                  <TableRow key={invoice.id}>
                    <TableCell>{invoice.invoiceNumber}</TableCell>
                    <TableCell>{clientDisplayName(client)}</TableCell>
                    <TableCell>{invoice.dueDate.toLocaleDateString("en-IE")}</TableCell>
                    <TableCell className="text-right">{formatMoney(invoice.amountDue, invoice.currency)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Accounting Export</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Export invoice records with net, tax and gross amounts, payment status, and payment references for a date
            range — ready to hand to an accountant.
          </p>
          <form className="flex flex-wrap items-end gap-3" method="get" action="/api/export/accounting">
            <div>
              <Label htmlFor="acc-from">From</Label>
              <Input id="acc-from" type="date" name="from" defaultValue={yearStart} required />
            </div>
            <div>
              <Label htmlFor="acc-to">To</Label>
              <Input id="acc-to" type="date" name="to" defaultValue={today} required />
            </div>
            <Button type="submit" variant="outline">
              Export CSV
            </Button>
          </form>
          <div className="flex gap-3 pt-2 text-sm">
            <a className="text-brand hover:underline" href="/api/export/clients">Export all clients (CSV)</a>
            <a className="text-brand hover:underline" href="/api/export/invoices">Export all invoices (CSV)</a>
            <a className="text-brand hover:underline" href="/api/export/payments">Export all payments (CSV)</a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
