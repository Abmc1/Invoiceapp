import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AppNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center px-4">
      <div className="font-display text-2xl">Not found</div>
      <p className="max-w-md text-sm text-muted-foreground">
        The record you&apos;re looking for doesn&apos;t exist, or may have been removed.
      </p>
      <Button asChild>
        <Link href="/dashboard">Back to Dashboard</Link>
      </Button>
    </div>
  );
}
