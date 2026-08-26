import { SubmitButton } from "@/components/ui/submit-button";
import { setInvoiceArchivedAction } from "@/app/(app)/invoices/actions";

export function ArchiveInvoiceButton({ invoiceId, archived }: { invoiceId: string; archived: boolean }) {
  return (
    <form action={setInvoiceArchivedAction.bind(null, invoiceId, !archived)} className="inline">
      <SubmitButton variant="ghost" size="sm" pendingText={archived ? "Unarchiving…" : "Archiving…"}>
        {archived ? "Unarchive" : "Archive"}
      </SubmitButton>
    </form>
  );
}
