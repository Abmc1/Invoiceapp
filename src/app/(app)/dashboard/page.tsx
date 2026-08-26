import Link from "next/link";
import { dashboardSummary, recentInvoices, revenueByMonth } from "@/lib/services/reports";
import { listOverdueInvoices, daysOverdue } from "@/lib/services/invoices";
import { clientDisplayName } from "@/lib/services/clients";
import { getCompanySettings } from "@/lib/services/settings";
import { formatMoney } from "@/lib/money";
import { StatCard } from "@/components/dashboard/stat-card";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { StatusChart, type StatusDatum } from "@/components/dashboard/status-chart";
import { InvoiceStatusBadge } from "@/components/invoices/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function DashboardPage() {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);

  const [summary, recent, overdue, settings, revenueTrend] = await Promise.all([
    dashboardSummary(),
    recentInvoices(8),
    listOverdueInvoices(),
    getCompanySettings(),
    revenueByMonth({ from: sixMonthsAgo }),
  ]);

  const currency = settings.defaultCurrency;

  const statusData: StatusDatum[] = [
    { label: "Draft", count: Number(summary.draftCount), color: "var(--muted-foreground)" },
    { label: "Sent", count: Number(summary.sentCount), color: "var(--info)" },
    { label: "Partially Paid", count: Number(summary.partiallyPaidCount), color: "var(--warning)" },
    { label: "Paid", count: Number(summary.paidCount), color: "var(--success)" },
    { label: "Overdue", count: Number(summary.overdueCount), color: "var(--danger)" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Overview of MotivAction&apos;s invoicing &amp; billing.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/clients/new">New Client</Link>
          </Button>
          <Button asChild>
            <Link href="/invoices/new">New Invoice</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Invoiced" value={formatMoney(summary.totalInvoiced, currency)} tone="brand" />
        <StatCard label="Total Paid" value={formatMoney(summary.totalPaid, currency)} tone="success" />
        <StatCard label="Outstanding" value={formatMoney(summary.totalOutstanding, currency)} />
        <StatCard label="Overdue" value={formatMoney(summary.totalOverdue, currency)} tone="danger" hint={`${summary.overdueCount} invoice(s)`} />
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
        <StatCard label="Draft" value={String(summary.draftCount)} />
        <StatCard label="Sent" value={String(summary.sentCount)} />
        <StatCard label="Partially Paid" value={String(summary.partiallyPaidCount)} />
        <StatCard label="Paid" value={String(summary.paidCount)} />
        <StatCard label="Overdue" value={String(summary.overdueCount)} tone="danger" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue — Last 6 Months</CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueChart data={revenueTrend} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invoices by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <StatusChart data={statusData} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Recent Invoices</CardTitle>
            <Button asChild variant="link" size="sm">
              <Link href="/invoices">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      No invoices yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  recent.map(({ invoice, client }) => (
                    <TableRow key={invoice.id}>
                      <TableCell>
                        <Link href={`/invoices/${invoice.id}`} className="font-medium text-brand hover:underline">
                          {invoice.invoiceNumber}
                        </Link>
                      </TableCell>
                      <TableCell className="truncate max-w-[160px]">{clientDisplayName(client)}</TableCell>
                      <TableCell>
                        <InvoiceStatusBadge status={invoice.status} dueDate={invoice.dueDate} />
                      </TableCell>
                      <TableCell className="text-right">{formatMoney(invoice.total, invoice.currency)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Overdue Invoices</CardTitle>
            <Button asChild variant="link" size="sm">
              <Link href="/invoices?status=OVERDUE">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-right">Overdue</TableHead>
                  <TableHead className="text-right">Amount Due</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overdue.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      Nothing overdue.
                    </TableCell>
                  </TableRow>
                ) : (
                  overdue.slice(0, 8).map(({ invoice, client }) => (
                    <TableRow key={invoice.id}>
                      <TableCell>
                        <Link href={`/invoices/${invoice.id}`} className="font-medium text-brand hover:underline">
                          {invoice.invoiceNumber}
                        </Link>
                      </TableCell>
                      <TableCell className="truncate max-w-[140px]">{clientDisplayName(client)}</TableCell>
                      <TableCell className="text-right text-danger">{daysOverdue(invoice.dueDate)}d</TableCell>
                      <TableCell className="text-right">{formatMoney(invoice.amountDue, invoice.currency)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
