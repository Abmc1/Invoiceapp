"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { runRemindersNowAction } from "@/app/(app)/settings/actions";

export function RunRemindersButton() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleClick() {
    setMessage(null);
    startTransition(async () => {
      const result = await runRemindersNowAction();
      setMessage(result.skipped ? result.skipped : `Sent ${result.sent} reminder(s).`);
    });
  }

  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" onClick={handleClick} disabled={pending}>
        {pending ? "Checking…" : "Run Reminder Check Now"}
      </Button>
      {message ? <Alert>{message}</Alert> : null}
    </div>
  );
}
