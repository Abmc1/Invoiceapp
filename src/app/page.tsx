import { redirect } from "next/navigation";

export default function RootPage() {
  // Unauthenticated requests never reach here — proxy.ts redirects to /login first.
  redirect("/dashboard");
}
