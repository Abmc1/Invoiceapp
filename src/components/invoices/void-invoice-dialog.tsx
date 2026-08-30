"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";

export function VoidInvoiceDialog({ action }: { action: (formData: FormData) => void | Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  async function handleSubmit(formData: FormData) {
    setError(null);
    try {
      await action(formData);
      setOpen(false);
      toast({ description: "Invoice voided.", variant: "success" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to void invoice. Please try again.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (next) setError(null); }}>
      <DialogTrigger asChild>
        <Button variant="destructive">Void Invoice</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Void this invoice?</DialogTitle>
          <DialogDescription>
            Voiding preserves the invoice as a permanent record but removes it from outstanding totals. It cannot be
            undone — if the amount needs to be re-billed, create a replacement invoice afterwards.
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          {error ? <Alert variant="destructive">{error}</Alert> : null}
          <div>
            <Label htmlFor="reason">Reason</Label>
            <Textarea id="reason" name="reason" rows={2} required placeholder="e.g. Incorrect rate applied" />
          </div>
          <DialogFooter>
            <SubmitButton variant="destructive" pendingText="Voiding…">
              Void Invoice
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
