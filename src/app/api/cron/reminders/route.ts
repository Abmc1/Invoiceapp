import { NextResponse } from "next/server";
import { runDueReminders } from "@/lib/services/reminders";
import { checkRateLimit, getClientIp } from "@/lib/auth/rate-limit";

/**
 * Intended to be called by a scheduled job (e.g. Vercel Cron) once a day.
 * Protected by CRON_SECRET so it can't be triggered by anyone who finds the
 * URL. Does nothing unless reminders are enabled in Settings > Reminders.
 *
 * Vercel Cron example (vercel.json):
 *   { "crons": [{ "path": "/api/cron/reminders", "schedule": "0 8 * * *" }] }
 * Vercel automatically sends the Authorization header for cron-triggered
 * requests when CRON_SECRET is set in the project's environment variables.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    // Fail closed in production: an unauthenticated endpoint that can
    // trigger unlimited outbound emails (once reminders are enabled) must
    // never be reachable without a secret configured. In development,
    // allow it through unauthenticated so `curl localhost:3000/api/...`
    // works without extra setup.
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 503 });
    }
  } else {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // Defense in depth even with a correct secret: caps how often this can
  // fire in case the secret ever leaks (e.g. logged, committed by mistake).
  const ip = getClientIp(request.headers);
  const rateLimit = checkRateLimit(`cron-reminders:${ip}`, { maxAttempts: 6, windowMs: 60 * 60 * 1000 });
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Rate limited." }, { status: 429 });
  }

  const result = await runDueReminders();
  return NextResponse.json(result);
}
