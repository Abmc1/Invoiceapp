"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function SettingsNav({ tabs }: { tabs: Array<{ href: string; label: string }> }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-1 border-b border-border" aria-label="Settings sections">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              active
                ? "border-brand text-brand"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-brand/40"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
