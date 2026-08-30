import { getCurrentUser } from "@/lib/auth/session";
import { SettingsNav } from "@/components/settings/settings-nav";

const ADMIN_ONLY_TABS = [
  { href: "/settings/business", label: "Business" },
  { href: "/settings/invoices", label: "Invoices" },
  { href: "/settings/bank-details", label: "Bank Details" },
  { href: "/settings/email", label: "Email" },
  { href: "/settings/reminders", label: "Reminders" },
  { href: "/settings/archiving", label: "Archiving" },
  { href: "/settings/users", label: "Users" },
];

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const tabs =
    user?.role === "ADMIN" ? [{ href: "/settings/account", label: "Account" }, ...ADMIN_ONLY_TABS] : [{ href: "/settings/account", label: "Account" }];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl">Settings</h1>
        <p className="text-sm text-muted-foreground">
          {user?.role === "ADMIN"
            ? "Configure MotivAction's business, invoicing and system settings."
            : "Manage your account."}
        </p>
      </div>

      <SettingsNav tabs={tabs} />

      <div className="max-w-2xl">{children}</div>
    </div>
  );
}
