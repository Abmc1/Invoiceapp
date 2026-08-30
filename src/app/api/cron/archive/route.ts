import { NextResponse } from "next/server";
import { runAutoArchive } from "@/lib/services/invoices";
import { checkRateLimit, getClientIp } from "@/lib/auth/rate-limit";

/**
 * Intended to be called by a scheduled job (Vercel Cron) once a day — see
 * vercel.json. Protected by CRON_SECRET so it can't be triggered by anyone
 * who finds the URL. Does nothing unless auto-archiving is enabled in
 * Settings > Archiving (on by default, but still gated the same way as the
 * reminders cron for defense in depth).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    // Fail closed in production; allow unauthenticated local testing, same
    // rationale as /api/cron/reminders.
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
  const rateLimit = checkRateLimit(`cron-archive:${ip}`, { maxAttempts: 6, windowMs: 60 * 60 * 1000 });
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Rate limited." }, { status: 429 });
  }

  const result = await runAutoArchive();
  return NextResponse.json(result);
}
