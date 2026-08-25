"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import type { Service } from "@/db/schema";

export function ServiceDialog({
  action,
  service,
  trigger,
}: {
  action: (formData: FormData) => void | Promise<void>;
  service?: Service;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  async function handleSubmit(formData: FormData) {
    await action(formData);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{service ? "Edit Service" : "New Service"}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required defaultValue={service?.name ?? ""} />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" rows={2} defaultValue={service?.description ?? ""} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="defaultRate">Default Rate (€)</Label>
              <Input id="defaultRate" name="defaultRate" type="number" step="0.01" min="0" required defaultValue={service?.defaultRate ?? "0"} />
            </div>
            <div>
              <Label htmlFor="rateType">Rate Type</Label>
              <Select id="rateType" name="rateType" defaultValue={service?.rateType ?? "FIXED"}>
                <option value="HOURLY">Hourly</option>
                <option value="DAILY">Daily</option>
                <option value="FIXED">Fixed</option>
                <option value="CUSTOM">Custom</option>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="defaultTaxRate">Default Tax Rate (%, optional — falls back to company default)</Label>
            <Input id="defaultTaxRate" name="defaultTaxRate" type="number" step="0.01" min="0" defaultValue={service?.defaultTaxRate ?? ""} />
          </div>
          <DialogFooter>
            <Button type="submit">{service ? "Save Changes" : "Create Service"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
