import Link from "next/link";
import { listInvoices, countInvoices, type InvoiceListFilters } from "@/lib/services/invoices";
import { clientDisplayName } from "@/lib/services/clients";
import { formatMoney } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { InvoiceStatusBadge } from "@/components/invoices/status-badge";
import { ArchiveInvoiceButton } from "@/components/invoices/archive-invoice-button";

const STATUS_TABS: Array<{ value: string; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "DRAFT", label: "Draft" },
  { value: "SENT", label: "Sent" },
  { value: "PARTIALLY_PAID", label: "Partially Paid" },
  { value: "PAID", label: "Paid" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "VOID", label: "Void / Cancelled" },
];

const ARCHIVABLE_STATUSES = new Set(["PAID", "VOID", "CANCELLED"]);
const PAGE_SIZE = 50;

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
  const includeArchived = params.archived === "1";
  const page = Math.max(1, Number(typeof params.page === "string" ? params.page : "1") || 1);

  const filters: InvoiceListFilters = {
    status: status === "ALL" ? "ALL" : (status as InvoiceListFilters["status"]),
    search: search || undefined,
    dateFrom: dateFrom ? new Date(dateFrom) : undefined,
    dateTo: dateTo ? new Date(dateTo) : undefined,
    includeArchived,
  };

  const [rows, total] = await Promise.all([
    listInvoices({ ...filters, page, pageSize: PAGE_SIZE }),
    countInvoices(filters),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(total, page * PAGE_SIZE);

  const baseParams = new URLSearchParams();
  baseParams.set("status", status);
  if (search) baseParams.set("q", search);
  if (dateFrom) baseParams.set("from", dateFrom);
  if (dateTo) baseParams.set("to", dateTo);
  if (includeArchived) baseParams.set("archived", "1");

  function pageHref(targetPage: number) {
    const p = new URLSearchParams(baseParams);
    if (targetPage > 1) p.set("page", String(targetPage));
    return `/invoices?${p.toString()}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl">Invoices</h1>
          <p className="text-sm text-muted-foreground">
            {total === 0 ? "0 invoices" : `Showing ${rangeStart}–${rangeEnd} of ${total} invoice(s)`}
          </p>
        </div>
        <Button asChild>
          <Link href="/invoices/new">New Invoice</Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={`/invoices?status=${tab.value}${includeArchived ? "&archived=1" : ""}`}
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
            <label className="flex items-center gap-2 text-sm h-10">
              <input type="checkbox" name="archived" value="1" defaultChecked={includeArchived} className="size-4" />
              Show archived
            </label>
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
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
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
                  <div className="flex items-center gap-1.5">
                    <InvoiceStatusBadge status={invoice.status} dueDate={invoice.dueDate} />
                    {invoice.archived ? <Badge variant="muted">Archived</Badge> : null}
                  </div>
                </TableCell>
                <TableCell className="text-right">{formatMoney(invoice.total, invoice.currency)}</TableCell>
                <TableCell className="text-right">
                  {ARCHIVABLE_STATUSES.has(invoice.status) ? (
                    <ArchiveInvoiceButton invoiceId={invoice.id} archived={invoice.archived} />
                  ) : null}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            {page > 1 ? (
              <Button asChild variant="outline" size="sm">
                <Link href={pageHref(page - 1)}>Previous</Link>
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled>
                Previous
              </Button>
            )}
            {page < totalPages ? (
              <Button asChild variant="outline" size="sm">
                <Link href={pageHref(page + 1)}>Next</Link>
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled>
                Next
              </Button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
