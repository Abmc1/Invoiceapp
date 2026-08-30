import { SubmitButton } from "@/components/ui/submit-button";
import { ActionForm } from "@/components/ui/action-form";
import { setInvoiceArchivedAction } from "@/app/(app)/invoices/actions";

export function ArchiveInvoiceButton({ invoiceId, archived }: { invoiceId: string; archived: boolean }) {
  return (
    <ActionForm
      action={setInvoiceArchivedAction.bind(null, invoiceId, !archived)}
      successMessage={archived ? "Invoice unarchived." : "Invoice archived."}
      className="inline"
    >
      <SubmitButton variant="ghost" size="sm" pendingText={archived ? "Unarchiving…" : "Archiving…"}>
        {archived ? "Unarchive" : "Archive"}
      </SubmitButton>
    </ActionForm>
  );
}
