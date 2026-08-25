"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LayoutDashboard, FileText, Users, Briefcase, Wallet, BarChart3, Settings, LogOut } from "lucide-react";
import { logoutAction } from "@/app/(app)/actions";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/services", label: "Services", icon: Briefcase },
  { href: "/payments", label: "Payments", icon: Wallet },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function MobileNav({ userName }: { userName: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="md:hidden">
      <div className="flex h-14 items-center justify-between border-b border-border bg-surface px-4">
        <span className="font-display text-brand text-lg">MotivAction</span>
        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="rounded-md p-2 hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-brand"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open ? (
        <nav className="border-b border-border bg-surface px-3 py-2" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium",
                  active ? "bg-brand text-brand-foreground" : "text-foreground/80 hover:bg-surface-muted"
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
          <div className="mt-2 border-t border-border pt-2">
            <Link
              href="/settings/account"
              onClick={() => setOpen(false)}
              className="block px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              {userName}
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-foreground/80 hover:bg-surface-muted"
              >
                <LogOut className="size-4" />
                Log out
              </button>
            </form>
          </div>
        </nav>
      ) : null}
    </div>
  );
}
