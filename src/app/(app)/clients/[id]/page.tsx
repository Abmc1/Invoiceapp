import Link from "next/link";
import { notFound } from "next/navigation";
import { getClientSummary, clientDisplayName } from "@/lib/services/clients";
import { formatMoney } from "@/lib/money";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatCard } from "@/components/dashboard/stat-card";
import { InvoiceStatusBadge } from "@/components/invoices/status-badge";
import { ClientForm } from "@/components/clients/client-form";
import { updateClientAction, archiveClientAction } from "../actions";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const summary = await getClientSummary(id);
  if (!summary) notFound();

  const { client, invoices } = summary;
  const boundUpdate = updateClientAction.bind(null, client.id);
  const boundArchive = archiveClientAction.bind(null, client.id, !client.active);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl">{clientDisplayName(client)}</h1>
          <p className="text-sm text-muted-foreground capitalize">{client.clientType.toLowerCase()} · {client.active ? "Active" : "Archived"}</p>
        </div>
        <div className="flex gap-2">
          <form action={boundArchive}>
            <Button type="submit" variant="outline">{client.active ? "Archive Client" : "Reactivate Client"}</Button>
          </form>
          <Button asChild>
            <Link href={`/invoices/new?clientId=${client.id}`}>New Invoice</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Invoiced" value={formatMoney(summary.totalInvoiced)} tone="brand" />
        <StatCard label="Total Paid" value={formatMoney(summary.totalPaid)} tone="success" />
        <StatCard label="Outstanding" value={formatMoney(summary.totalOutstanding)} />
        <StatCard
          label="Avg. Payment Time"
          value={summary.avgPaymentDays !== null ? `${summary.avgPaymentDays}d` : "—"}
          hint={summary.overdueCount > 0 ? `${summary.overdueCount} overdue` : undefined}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Invoice History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      No invoices yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell>
                        <Link href={`/invoices/${invoice.id}`} className="font-medium text-brand hover:underline">
                          {invoice.invoiceNumber}
                        </Link>
                      </TableCell>
                      <TableCell>{invoice.issueDate.toLocaleDateString("en-IE")}</TableCell>
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

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Edit Client</CardTitle>
          </CardHeader>
          <CardContent>
            <ClientForm action={boundUpdate} defaultValues={client} submitLabel="Save Changes" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
