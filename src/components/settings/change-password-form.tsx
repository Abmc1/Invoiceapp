"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { changeOwnPasswordAction, type ChangePasswordState } from "@/app/(app)/settings/actions";

const initialState: ChangePasswordState = {};

export function ChangePasswordForm() {
  const [state, formAction] = useActionState(changeOwnPasswordAction, initialState);

  return (
    <form action={formAction} className="space-y-4" key={state.success ? "reset" : "form"}>
      {state.error ? <Alert variant="destructive">{state.error}</Alert> : null}
      {state.success ? <Alert variant="success">Password changed successfully.</Alert> : null}

      <div>
        <Label htmlFor="currentPassword">Current Password</Label>
        <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
      </div>
      <div>
        <Label htmlFor="newPassword">New Password</Label>
        <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      <div>
        <Label htmlFor="confirmPassword">Confirm New Password</Label>
        <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      <SubmitButton pendingText="Changing…">Change Password</SubmitButton>
    </form>
  );
}
