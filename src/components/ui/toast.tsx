"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type ToastVariant = "default" | "success" | "warning" | "destructive";

interface Toast {
  id: string;
  description: string;
  variant: ToastVariant;
}

interface ToastOptions {
  description: string;
  variant?: ToastVariant;
  /** ms before auto-dismiss. Defaults to 5000; errors get a longer 8000 unless overridden. */
  duration?: number;
}

const ToastContext = React.createContext<{ toast: (options: ToastOptions) => void } | null>(null);

const VARIANT_STYLES: Record<ToastVariant, string> = {
  default: "border-border bg-surface text-foreground",
  success: "border-green-200 bg-green-50 text-green-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  destructive: "border-red-200 bg-red-50 text-red-800",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const dismiss = React.useCallback((id: string) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const toast = React.useCallback(
    ({ description, variant = "default", duration }: ToastOptions) => {
      const id = crypto.randomUUID();
      setToasts((current) => [...current, { id, description, variant }]);
      const timeout = duration ?? (variant === "destructive" ? 8000 : 5000);
      setTimeout(() => dismiss(id), timeout);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              "flex items-start justify-between gap-3 rounded-md border px-4 py-3 text-sm shadow-lg animate-in fade-in slide-in-from-bottom-2",
              VARIANT_STYLES[t.variant]
            )}
          >
            <span>{t.description}</span>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="shrink-0 opacity-60 hover:opacity-100"
              aria-label="Dismiss notification"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider.");
  return ctx;
}
