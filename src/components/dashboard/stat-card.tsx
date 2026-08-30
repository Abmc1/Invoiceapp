import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  tone = "default",
  hint,
  href,
}: {
  label: string;
  value: string;
  tone?: "default" | "brand" | "danger" | "success";
  hint?: string;
  href?: string;
}) {
  const content = (
    <CardContent className="p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-2 font-display text-2xl",
          tone === "brand" && "text-brand",
          tone === "danger" && "text-danger",
          tone === "success" && "text-success"
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </CardContent>
  );

  if (href) {
    return (
      <Card>
        <Link href={href} className="block rounded-lg transition-colors hover:bg-surface-muted">
          {content}
        </Link>
      </Card>
    );
  }

  return <Card>{content}</Card>;
}
