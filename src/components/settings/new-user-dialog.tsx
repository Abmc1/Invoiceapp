"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";

export function NewUserDialog({ action }: { action: (formData: FormData) => void | Promise<void> }) {
  const [open, setOpen] = useState(false);

  async function handleSubmit(formData: FormData) {
    await action(formData);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>New User</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New User</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div>
            <Label htmlFor="password">Temporary Password</Label>
            <Input id="password" name="password" type="password" minLength={8} required />
          </div>
          <div>
            <Label htmlFor="role">Role</Label>
            <Select id="role" name="role" defaultValue="USER">
              <option value="USER">User</option>
              <option value="ADMIN">Admin</option>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit">Create User</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
