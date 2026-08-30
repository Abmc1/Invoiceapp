"use client";

import { useToast } from "./toast";

/** Errors thrown by Next's redirect()/notFound() carry this digest — never swallow them, or the navigation they were driving silently breaks. */
function isFrameworkSignal(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest: unknown }).digest === "string" &&
    ((error as { digest: string }).digest.startsWith("NEXT_REDIRECT") ||
      (error as { digest: string }).digest === "NEXT_NOT_FOUND")
  );
}

/**
 * Drop-in replacement for `<form action={serverAction}>` that turns a thrown
 * error into a toast instead of the framework's crash screen, and optionally
 * confirms success with a toast too. Use for actions that stay on the same
 * page (no redirect) and can fail on legitimate business rules (e.g. "only
 * paid invoices can be archived") that shouldn't read as an app crash.
 */
export function ActionForm({
  action,
  successMessage,
  className,
  children,
}: {
  action: (formData: FormData) => Promise<unknown>;
  successMessage?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const { toast } = useToast();

  async function handleSubmit(formData: FormData) {
    try {
      await action(formData);
      if (successMessage) toast({ description: successMessage, variant: "success" });
    } catch (err) {
      if (isFrameworkSignal(err)) throw err;
      toast({
        description: err instanceof Error ? err.message : "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  }

  return (
    <form action={handleSubmit} className={className}>
      {children}
    </form>
  );
}
