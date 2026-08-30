"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { runAutoArchiveNowAction } from "@/app/(app)/settings/actions";

export function RunAutoArchiveButton() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleClick() {
    setMessage(null);
    startTransition(async () => {
      const result = await runAutoArchiveNowAction();
      setMessage(result.skipped ? result.skipped : `Archived ${result.archived} invoice(s).`);
    });
  }

  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" onClick={handleClick} disabled={pending}>
        {pending ? "Checking…" : "Run Archive Sweep Now"}
      </Button>
      {message ? <Alert>{message}</Alert> : null}
    </div>
  );
}
