import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Secure, database-backed check — the source of truth for authorization.
  // (proxy.ts only performs a fast, optimistic cookie-signature check.)
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-1">
      <Sidebar userName={user.name} userRole={user.role} />
      <div className="flex flex-1 flex-col min-w-0">
        <MobileNav userName={user.name} />
        <main className="flex-1 p-4 md:p-8 max-w-[1400px] w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
