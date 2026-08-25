"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/ui/submit-button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";

export function RecordPaymentDialog({
  action,
  amountDue,
}: {
  action: (formData: FormData) => void | Promise<void>;
  amountDue: string;
}) {
  const [open, setOpen] = useState(false);

  async function handleSubmit(formData: FormData) {
    await action(formData);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Record Payment</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="amount">Amount (€)</Label>
            <Input id="amount" name="amount" type="number" step="0.01" min="0.01" defaultValue={amountDue} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="paymentDate">Payment Date</Label>
              <Input id="paymentDate" name="paymentDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
            </div>
            <div>
              <Label htmlFor="paymentMethod">Method</Label>
              <Select id="paymentMethod" name="paymentMethod" defaultValue="BANK_TRANSFER">
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="OTHER">Other</option>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="reference">Reference</Label>
            <Input id="reference" name="reference" placeholder="e.g. bank transaction ref" />
          </div>
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={2} />
          </div>
          <DialogFooter>
            <SubmitButton pendingText="Saving Payment…">Save Payment</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
