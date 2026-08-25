"use client";

import { SubmitButton } from "@/components/ui/submit-button";

export function DeleteDraftButton({ action }: { action: () => void | Promise<void> }) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm("Delete this draft invoice? This cannot be undone.")) {
          e.preventDefault();
        }
      }}
    >
      <SubmitButton variant="ghost" pendingText="Deleting…">
        Delete Draft
      </SubmitButton>
    </form>
  );
}
