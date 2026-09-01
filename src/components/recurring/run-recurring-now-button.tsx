"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { runRecurringInvoicesNowAction } from "@/app/(app)/recurring/actions";

export function RunRecurringNowButton() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleClick() {
    setMessage(null);
    startTransition(async () => {
      const result = await runRecurringInvoicesNowAction();
      const parts = [`Generated ${result.generated} invoice(s).`];
      if (result.ended > 0) parts.push(`${result.ended} schedule(s) ended.`);
      if (result.errors.length > 0) parts.push(`${result.errors.length} error(s) — check the schedule details.`);
      setMessage(parts.join(" "));
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button type="button" variant="outline" onClick={handleClick} disabled={pending}>
        {pending ? "Checking…" : "Run Now"}
      </Button>
      {message ? (
        <Alert variant="default" className="text-xs">
          {message}
        </Alert>
      ) : null}
    </div>
  );
}
