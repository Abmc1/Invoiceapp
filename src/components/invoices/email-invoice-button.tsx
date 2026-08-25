"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { sendInvoiceEmailAction } from "@/app/(app)/invoices/actions";

export function EmailInvoiceButton({ invoiceId, disabled }: { invoiceId: string; disabled?: boolean }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ text: string; variant: "success" | "warning" | "destructive" } | null>(null);

  function handleClick() {
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await sendInvoiceEmailAction(invoiceId);
        if (result.mocked) {
          setMessage({
            text: "No email provider is configured, so the invoice email was logged to the server console instead of actually being sent. Configure SMTP in Settings > Email to send real emails.",
            variant: "warning",
          });
        } else {
          setMessage({ text: "Invoice emailed successfully.", variant: "success" });
        }
      } catch (err) {
        setMessage({ text: err instanceof Error ? err.message : "Failed to send email.", variant: "destructive" });
      }
    });
  }

  return (
    <div className="space-y-2">
      <Button variant="outline" onClick={handleClick} disabled={disabled || pending}>
        {pending ? "Sending…" : "Email Invoice"}
      </Button>
      {message ? <Alert variant={message.variant}>{message.text}</Alert> : null}
    </div>
  );
}
