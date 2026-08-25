"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/** Root-level fallback for errors outside the authenticated app area (e.g. on /login). */
export default function RootError({
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
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface-muted text-center px-4">
      <div className="font-display text-2xl text-brand">MotivAction</div>
      <p className="max-w-md text-sm text-muted-foreground">
        {error.message || "Something went wrong. Please try again."}
      </p>
      <Button onClick={() => retry()}>Try Again</Button>
    </div>
  );
}
