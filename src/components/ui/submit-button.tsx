"use client";

import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "./button";

/**
 * Submit button that disables itself while its parent form's action is
 * pending. Used on every action that touches money (finalising an invoice,
 * recording a payment, voiding) so an impatient double-click can't create a
 * duplicate financial record.
 */
export function SubmitButton({
  children,
  pendingText,
  ...props
}: ButtonProps & { pendingText?: string }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} {...props}>
      {pending ? pendingText ?? "Saving…" : children}
    </Button>
  );
}
