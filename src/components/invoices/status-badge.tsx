import { Badge, type BadgeProps } from "@/components/ui/badge";
import { isInvoiceOverdue } from "@/lib/services/invoices";

const STATUS_CONFIG: Record<string, { label: string; variant: BadgeProps["variant"] }> = {
  DRAFT: { label: "Draft", variant: "muted" },
  SENT: { label: "Sent", variant: "info" },
  PARTIALLY_PAID: { label: "Partially Paid", variant: "warning" },
  PAID: { label: "Paid", variant: "success" },
  OVERDUE: { label: "Overdue", variant: "danger" },
  VOID: { label: "Void", variant: "muted" },
  CANCELLED: { label: "Cancelled", variant: "muted" },
};

export function InvoiceStatusBadge({ status, dueDate }: { status: string; dueDate: Date }) {
  const displayStatus = isInvoiceOverdue({ status, dueDate }) ? "OVERDUE" : status;
  const config = STATUS_CONFIG[displayStatus] ?? { label: displayStatus, variant: "default" as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
