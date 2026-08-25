import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          "flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
