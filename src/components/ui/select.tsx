import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * A native <select>, styled to match the rest of the kit. Deliberately not
 * Radix's Select: this app's forms post via native <form action={serverAction}>
 * and FormData, which a native select participates in for free.
 */
const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          "flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand",
          className
        )}
        {...props}
      >
        {children}
      </select>
    );
  }
);
Select.displayName = "Select";

export { Select };
