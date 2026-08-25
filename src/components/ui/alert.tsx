import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const alertVariants = cva("rounded-md border px-4 py-3 text-sm flex items-start gap-2", {
  variants: {
    variant: {
      default: "border-border bg-surface-muted text-foreground",
      destructive: "border-red-200 bg-red-50 text-red-800",
      success: "border-green-200 bg-green-50 text-green-800",
      warning: "border-amber-200 bg-amber-50 text-amber-800",
    },
  },
  defaultVariants: { variant: "default" },
});

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof alertVariants> {}

function Alert({ className, variant, ...props }: AlertProps) {
  return <div role="alert" className={cn(alertVariants({ variant }), className)} {...props} />;
}

export { Alert };
