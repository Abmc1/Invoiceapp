"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/ui/submit-button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";

export function VoidInvoiceDialog({ action }: { action: (formData: FormData) => void | Promise<void> }) {
  const [open, setOpen] = useState(false);

  async function handleSubmit(formData: FormData) {
    await action(formData);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
