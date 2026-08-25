import { redirect } from "next/navigation";
import { getPendingTwoFactorUserId } from "@/lib/auth/session";
import { VerifyForm } from "./verify-form";

export default async function VerifyOtpPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const pendingUserId = await getPendingTwoFactorUserId();
  if (!pendingUserId) {
    redirect("/login");
  }

  const params = await searchParams;
  const redirectTo = typeof params.redirectTo === "string" ? params.redirectTo : "/dashboard";

  return (
    <div className="flex flex-1 items-center justify-center bg-surface-muted px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="font-display text-3xl text-brand">MotivAction</div>
          <p className="mt-1 text-sm text-muted-foreground">Invoicing &amp; Client Billing</p>
        </div>

        <div className="rounded-lg border border-border bg-surface p-6 shadow-sm">
          <h1 className="font-display text-xl mb-1">Check your email</h1>
          <p className="text-sm text-muted-foreground mb-4">
            Enter the 6-digit code we just sent to your email address to finish signing in.
          </p>
          <VerifyForm redirectTo={redirectTo} />
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">Private system for MotivAction staff only.</p>
      </div>
    </div>
  );
}
