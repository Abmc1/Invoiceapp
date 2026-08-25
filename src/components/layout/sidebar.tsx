"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Users,
  Briefcase,
  Wallet,
  BarChart3,
  Settings,
  LogOut,
} from "lucide-react";
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

export function Sidebar({ userName, userRole }: { userName: string; userRole: string }) {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-60 md:flex-col md:border-r md:border-border md:bg-surface">
      <div className="flex h-16 items-center px-5 border-b border-border">
        <span className="font-display text-lg text-brand">MotivAction</span>
      </div>

      <nav className="flex-1 space-y-1 p-3" aria-label="Main navigation">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-brand text-brand-foreground"
                  : "text-foreground/80 hover:bg-surface-muted hover:text-foreground"
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-3">
        <Link href="/settings/account" className="block rounded-md px-3 py-2 hover:bg-surface-muted">
          <p className="text-sm font-medium truncate">{userName}</p>
          <p className="text-xs text-muted-foreground">{userRole === "ADMIN" ? "Administrator" : "User"}</p>
        </Link>
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-surface-muted hover:text-foreground"
          >
            <LogOut className="size-4" />
            Log out
          </button>
        </form>
      </div>
    </aside>
  );
}
