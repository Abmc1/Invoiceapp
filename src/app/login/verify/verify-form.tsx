"use client";

import { useActionState } from "react";
import { verifyOtpAction, resendOtpAction, type VerifyOtpState, type ResendOtpState } from "../actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { Button } from "@/components/ui/button";

const verifyInitialState: VerifyOtpState = {};
const resendInitialState: ResendOtpState = {};

export function VerifyForm({ redirectTo }: { redirectTo: string }) {
  const [state, formAction] = useActionState(verifyOtpAction, verifyInitialState);
  const [resendState, resendFormAction] = useActionState(resendOtpAction, resendInitialState);

  return (
    <div className="flex flex-col gap-4">
      <form action={formAction} className="flex flex-col gap-4" noValidate>
        <input type="hidden" name="redirectTo" value={redirectTo} />

        {state?.error ? <Alert variant="destructive">{state.error}</Alert> : null}

        <div>
          <Label htmlFor="code">6-digit code</Label>
          <Input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            placeholder="000000"
            className="text-center text-2xl tracking-[0.5em] font-medium"
            required
            autoFocus
          />
        </div>

        <SubmitButton pendingText="Verifying…" className="w-full">
          Verify &amp; Sign In
        </SubmitButton>
      </form>

      <form action={resendFormAction} className="text-center">
        {resendState?.message ? <p className="text-xs text-success mb-2">{resendState.message}</p> : null}
        {resendState?.error ? <p className="text-xs text-danger mb-2">{resendState.error}</p> : null}
        <Button type="submit" variant="link" size="sm">
          Resend code
        </Button>
      </form>
    </div>
  );
}
