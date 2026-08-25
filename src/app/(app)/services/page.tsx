import { listServices } from "@/lib/services/catalogue";
import { formatMoney } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ServiceDialog } from "@/components/services/service-dialog";
import { createServiceAction, updateServiceAction, archiveServiceAction } from "./actions";

const RATE_TYPE_LABEL: Record<string, string> = {
  HOURLY: "per hour",
  DAILY: "per day",
  FIXED: "fixed",
  CUSTOM: "custom",
};

export default async function ServicesPage() {
  const services = await listServices(true);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl">Services</h1>
          <p className="text-sm text-muted-foreground">MotivAction&apos;s billable service catalogue.</p>
        </div>
        <ServiceDialog action={createServiceAction} trigger={<Button>New Service</Button>} />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Default Rate</TableHead>
            <TableHead>Tax</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {services.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                No services yet — add MotivAction&apos;s coaching, workshop and training offerings here.
              </TableCell>
            </TableRow>
          ) : (
            services.map((service) => (
              <TableRow key={service.id}>
                <TableCell className="font-medium">{service.name}</TableCell>
                <TableCell className="max-w-xs truncate text-muted-foreground">{service.description || "—"}</TableCell>
                <TableCell>
                  {formatMoney(service.defaultRate)} {RATE_TYPE_LABEL[service.rateType]}
                </TableCell>
                <TableCell>{service.defaultTaxRate ? `${Number(service.defaultTaxRate)}%` : "Company default"}</TableCell>
                <TableCell>
                  <Badge variant={service.active ? "success" : "muted"}>{service.active ? "Active" : "Archived"}</Badge>
                </TableCell>
                <TableCell className="text-right space-x-2 whitespace-nowrap">
                  <ServiceDialog
                    action={updateServiceAction.bind(null, service.id)}
                    service={service}
                    trigger={<Button size="sm" variant="outline">Edit</Button>}
                  />
                  <form action={archiveServiceAction.bind(null, service.id, !service.active)} className="inline">
                    <Button size="sm" variant="ghost" type="submit">
                      {service.active ? "Archive" : "Reactivate"}
                    </Button>
                  </form>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
