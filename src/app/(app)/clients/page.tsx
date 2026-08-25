import Link from "next/link";
import { listClients, clientDisplayName } from "@/lib/services/clients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const search = typeof params.q === "string" ? params.q : "";
  const includeArchived = params.archived === "1";

  const clients = await listClients({ search: search || undefined, includeArchived });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl">Clients</h1>
          <p className="text-sm text-muted-foreground">{clients.length} client(s)</p>
        </div>
        <Button asChild>
          <Link href="/clients/new">New Client</Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <form className="flex flex-wrap items-end gap-3" method="get">
            <div className="flex-1 min-w-[220px]">
              <Input type="search" name="q" placeholder="Search by name, company or email…" defaultValue={search} />
            </div>
            <label className="flex items-center gap-2 text-sm h-10">
              <input type="checkbox" name="archived" value="1" defaultChecked={includeArchived} className="size-4" />
              Show archived
            </label>
            <Button type="submit" variant="outline">Search</Button>
          </form>
        </CardContent>
      </Card>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                No clients found.
              </TableCell>
            </TableRow>
          ) : (
            clients.map((client) => (
              <TableRow key={client.id}>
                <TableCell>
                  <Link href={`/clients/${client.id}`} className="font-medium text-brand hover:underline">
                    {clientDisplayName(client)}
                  </Link>
                </TableCell>
                <TableCell className="capitalize">{client.clientType.toLowerCase()}</TableCell>
                <TableCell>{client.email || "—"}</TableCell>
                <TableCell>{client.phone || "—"}</TableCell>
                <TableCell>
                  <Badge variant={client.active ? "success" : "muted"}>{client.active ? "Active" : "Archived"}</Badge>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
