import Link from "next/link";
import { listInvoices, type InvoiceListFilters } from "@/lib/services/invoices";
import { clientDisplayName } from "@/lib/services/clients";
import { formatMoney } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { InvoiceStatusBadge } from "@/components/invoices/status-badge";

const STATUS_TABS: Array<{ value: string; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "DRAFT", label: "Draft" },
  { value: "SENT", label: "Sent" },
  { value: "PARTIALLY_PAID", label: "Partially Paid" },
  { value: "PAID", label: "Paid" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "VOID", label: "Void / Cancelled" },
];

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const status = typeof params.status === "string" ? params.status : "ALL";
  const search = typeof params.q === "string" ? params.q : "";
  const dateFrom = typeof params.from === "string" ? params.from : "";
  const dateTo = typeof params.to === "string" ? params.to : "";

  const filters: InvoiceListFilters = {
    status: status === "ALL" ? "ALL" : (status as InvoiceListFilters["status"]),
    search: search || undefined,
    dateFrom: dateFrom ? new Date(dateFrom) : undefined,
    dateTo: dateTo ? new Date(dateTo) : undefined,
  };

  const rows = await listInvoices(filters);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl">Invoices</h1>
          <p className="text-sm text-muted-foreground">{rows.length} invoice(s)</p>
        </div>
        <Button asChild>
          <Link href="/invoices/new">New Invoice</Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={`/invoices?status=${tab.value}`}
            className={`rounded-full px-3 py-1.5 text-sm font-medium border ${
              status === tab.value ? "bg-brand text-brand-foreground border-brand" : "border-border hover:bg-surface-muted"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <Card>
        <CardContent className="p-4">
          <form className="flex flex-wrap items-end gap-3" method="get">
            <input type="hidden" name="status" value={status} />
            <div className="flex-1 min-w-[200px]">
              <Input type="search" name="q" placeholder="Search invoice # or client…" defaultValue={search} />
            </div>
            <Input type="date" name="from" defaultValue={dateFrom} aria-label="From date" />
            <Input type="date" name="to" defaultValue={dateTo} aria-label="To date" />
            <Button type="submit" variant="outline">
              Filter
            </Button>
          </form>
        </CardContent>
      </Card>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Issue Date</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                No invoices match these filters.
              </TableCell>
            </TableRow>
          ) : (
            rows.map(({ invoice, client }) => (
              <TableRow key={invoice.id}>
                <TableCell>
                  <Link href={`/invoices/${invoice.id}`} className="font-medium text-brand hover:underline">
                    {invoice.invoiceNumber}
                  </Link>
                </TableCell>
                <TableCell className="truncate max-w-[180px]">{clientDisplayName(client)}</TableCell>
                <TableCell>{invoice.issueDate.toLocaleDateString("en-IE")}</TableCell>
                <TableCell>{invoice.dueDate.toLocaleDateString("en-IE")}</TableCell>
                <TableCell>
                  <InvoiceStatusBadge status={invoice.status} dueDate={invoice.dueDate} />
                </TableCell>
                <TableCell className="text-right">{formatMoney(invoice.total, invoice.currency)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
