"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * Route-level error boundary for the authenticated app. Without this, an
 * unhandled error (e.g. "only draft invoices can be edited") falls through
 * to Next's generic "This page couldn't load" screen with no way back and
 * no indication of what actually went wrong — not acceptable for a tool
 * people use to manage real financial records.
 */
export default function AppError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center px-4">
      <div className="font-display text-2xl text-brand">Something went wrong</div>
      <p className="max-w-md text-sm text-muted-foreground">
        {error.message || "An unexpected error occurred while loading this page."}
      </p>
      <div className="flex gap-3">
        <Button variant="outline" asChild>
          <Link href="/dashboard">Back to Dashboard</Link>
        </Button>
        <Button onClick={() => retry()}>Try Again</Button>
      </div>
      {error.digest ? <p className="text-xs text-muted-foreground">Reference: {error.digest}</p> : null}
    </div>
  );
}
