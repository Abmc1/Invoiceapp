import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { invoiceEvents, invoices } from "@/db/schema";
import { getCompanySettings } from "./settings";
import { clientDisplayName } from "./clients";
import { getEmailProvider } from "@/lib/email";
import { renderReminderEmail } from "@/lib/email/templates";
import { recordInvoiceEvent } from "./audit";
import { daysOverdue } from "./invoices";

interface ReminderCandidate {
  invoiceId: string;
  stage: "BEFORE_DUE" | "ON_DUE" | "OVERDUE";
  daysOverdueValue?: number;
}

/**
 * Sends configured reminder emails (before due date, on due date, and N days
 * after due date) for all eligible SENT / PARTIALLY_PAID invoices. Does
 * nothing unless remindersEnabled is turned on in Settings > Reminders.
 * Each (invoice, stage, day) combination is only ever sent once, tracked via
 * a REMINDER_SENT invoice_event with matching metadata.
 *
 * This function is safe to call repeatedly (e.g. from a daily cron hitting
 * /api/cron/reminders, or manually from Settings) — it is idempotent per day.
 */
export async function runDueReminders(): Promise<{ sent: number; skipped: string }> {
  const settings = await getCompanySettings();
  if (!settings.remindersEnabled) {
    return { sent: 0, skipped: "Automated reminders are turned off in Settings." };
  }

  const afterDays = settings.reminderAfterDueDaysList
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);

  const candidates = await db
    .select({ invoice: invoices })
    .from(invoices)
    .where(sql`${invoices.status} in ('SENT','PARTIALLY_PAID')`);

  let sentCount = 0;
  const todayKey = new Date().toISOString().slice(0, 10);

  for (const { invoice } of candidates) {
    const dueInMs = invoice.dueDate.getTime() - Date.now();
    const dueInDays = Math.round(dueInMs / (1000 * 60 * 60 * 24));
    const overdueDays = daysOverdue(invoice.dueDate);

    const stages: ReminderCandidate[] = [];
    if (dueInDays === settings.reminderBeforeDueDays) {
      stages.push({ invoiceId: invoice.id, stage: "BEFORE_DUE" });
    }
    if (settings.reminderOnDueDate && dueInDays === 0) {
      stages.push({ invoiceId: invoice.id, stage: "ON_DUE" });
    }
    if (afterDays.includes(overdueDays)) {
      stages.push({ invoiceId: invoice.id, stage: "OVERDUE", daysOverdueValue: overdueDays });
    }

    for (const stage of stages) {
      const dedupeKey = `${stage.stage}:${stage.daysOverdueValue ?? 0}:${todayKey}`;

      const already = await db
        .select({ id: invoiceEvents.id })
        .from(invoiceEvents)
        .where(
          and(
            eq(invoiceEvents.invoiceId, invoice.id),
            eq(invoiceEvents.eventType, "REMINDER_SENT"),
            sql`${invoiceEvents.metadata}->>'dedupeKey' = ${dedupeKey}`
          )
        )
        .limit(1);

      if (already.length > 0) continue;

      const clientRow = await db.query.clients.findFirst({ where: (c, { eq }) => eq(c.id, invoice.clientId) });
      if (!clientRow?.email) continue;

      const { subject, html, text } = renderReminderEmail({
        companyName: settings.tradingName || settings.companyName,
        clientName: clientDisplayName(clientRow),
        invoiceNumber: invoice.invoiceNumber,
        total: invoice.total,
        currency: invoice.currency,
        dueDate: invoice.dueDate,
        reminderStage: stage.stage,
        daysOverdue: stage.daysOverdueValue,
      });

      const provider = await getEmailProvider();
      const result = await provider.send({ to: clientRow.email, subject, html, text });

      await recordInvoiceEvent(db, invoice.id, "REMINDER_SENT", {
        dedupeKey,
        stage: stage.stage,
        provider: result.provider,
        mocked: result.mocked,
      });

      sentCount += 1;
    }
  }

  return { sent: sentCount, skipped: "" };
}
