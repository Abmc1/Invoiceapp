"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { login, type LoginState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Signing in…" : "Sign in"}
    </Button>
  );
}

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const [state, formAction] = useActionState<LoginState, FormData>(login, {});

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="redirectTo" value={redirectTo} />

      {state?.error ? <Alert variant="destructive">{state.error}</Alert> : null}

      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="username" required autoFocus />
      </div>

      <div>
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>

      <SubmitButton />
    </form>
  );
}
