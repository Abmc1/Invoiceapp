import { NextResponse } from "next/server";
import { runDueRecurringInvoices } from "@/lib/services/recurring-invoices";
import { checkRateLimit, getClientIp } from "@/lib/auth/rate-limit";

/**
 * Intended to be called by a scheduled job (Vercel Cron) once a day — see
 * vercel.json. Protected by CRON_SECRET, same as /api/cron/reminders and
 * /api/cron/archive. Only ever creates DRAFT invoices — nothing is emailed
 * to a client without a human reviewing and sending it first.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 503 });
    }
  } else {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const ip = getClientIp(request.headers);
  const rateLimit = checkRateLimit(`cron-recurring:${ip}`, { maxAttempts: 6, windowMs: 60 * 60 * 1000 });
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Rate limited." }, { status: 429 });
  }

  const result = await runDueRecurringInvoices();
  return NextResponse.json(result);
}
