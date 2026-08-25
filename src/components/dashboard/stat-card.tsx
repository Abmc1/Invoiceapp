import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  tone = "default",
  hint,
}: {
  label: string;
  value: string;
  tone?: "default" | "brand" | "danger" | "success";
  hint?: string;
}) {
  return (
    <Card>
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
    </Card>
  );
}
