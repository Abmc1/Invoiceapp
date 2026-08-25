import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const from = typeof params.from === "string" ? params.from : "/dashboard";

  return (
    <div className="flex flex-1 items-center justify-center bg-surface-muted px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="font-display text-3xl text-brand">MotivAction</div>
          <p className="mt-1 text-sm text-muted-foreground">Invoicing &amp; Client Billing</p>
        </div>

        <div className="rounded-lg border border-border bg-surface p-6 shadow-sm">
          <h1 className="font-display text-xl mb-4">Sign in</h1>
          <LoginForm redirectTo={from} />
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Private system for MotivAction staff only.
        </p>
      </div>
    </div>
  );
}
