import { formatMoney } from "@/lib/money";

export interface InvoiceEmailData {
  companyName: string;
  clientName: string;
  invoiceNumber: string;
  total: string;
  currency: string;
  dueDate: Date;
  paymentInstructions?: string | null;
}

export function renderInvoiceEmail(data: InvoiceEmailData): { subject: string; html: string; text: string } {
  const dueDateStr = data.dueDate.toLocaleDateString("en-IE", { year: "numeric", month: "long", day: "numeric" });
  const amount = formatMoney(data.total, data.currency);

  const subject = `Invoice ${data.invoiceNumber} from ${data.companyName}`;

  const text = [
    `Dear ${data.clientName},`,
    "",
    `Please find attached invoice ${data.invoiceNumber} for ${amount}, due on ${dueDateStr}.`,
    "",
    data.paymentInstructions ?? "",
    "",
    `Thank you for your business.`,
    `${data.companyName}`,
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
  <div style="font-family: Arial, Helvetica, sans-serif; color: #1D1D1B; max-width: 560px; margin: 0 auto;">
    <div style="background: #C62435; padding: 20px 24px; border-radius: 6px 6px 0 0;">
      <span style="color: #ffffff; font-size: 18px; font-weight: bold; letter-spacing: 0.5px;">${data.companyName}</span>
    </div>
    <div style="border: 1px solid #e5e5e5; border-top: none; padding: 24px; border-radius: 0 0 6px 6px;">
      <p>Dear ${data.clientName},</p>
      <p>Please find attached invoice <strong>${data.invoiceNumber}</strong> for <strong>${amount}</strong>, due on <strong>${dueDateStr}</strong>.</p>
      ${data.paymentInstructions ? `<p style="white-space: pre-line; color: #444;">${data.paymentInstructions}</p>` : ""}
      <p>Thank you for your business.</p>
      <p style="margin-top: 24px;">Kind regards,<br/>${data.companyName}</p>
    </div>
  </div>`;

  return { subject, html, text };
}

export interface ReminderEmailData extends InvoiceEmailData {
  reminderStage: "BEFORE_DUE" | "ON_DUE" | "OVERDUE";
  daysOverdue?: number;
}

export function renderReminderEmail(data: ReminderEmailData): { subject: string; html: string; text: string } {
  const amount = formatMoney(data.total, data.currency);
  const dueDateStr = data.dueDate.toLocaleDateString("en-IE", { year: "numeric", month: "long", day: "numeric" });

  let headline: string;
  switch (data.reminderStage) {
    case "BEFORE_DUE":
      headline = `Your invoice ${data.invoiceNumber} is due on ${dueDateStr}.`;
      break;
    case "ON_DUE":
      headline = `Your invoice ${data.invoiceNumber} is due today.`;
      break;
    default:
      headline = `Friendly reminder: invoice ${data.invoiceNumber} is now ${data.daysOverdue ?? ""} day(s) overdue.`;
  }

  const subject = `Payment reminder: Invoice ${data.invoiceNumber} — ${data.companyName}`;
  const text = `Dear ${data.clientName},\n\n${headline}\n\nAmount due: ${amount}\n\nThank you,\n${data.companyName}`;
  const html = `
  <div style="font-family: Arial, Helvetica, sans-serif; color: #1D1D1B; max-width: 560px; margin: 0 auto;">
    <div style="background: #C62435; padding: 20px 24px; border-radius: 6px 6px 0 0;">
      <span style="color: #ffffff; font-size: 18px; font-weight: bold;">${data.companyName}</span>
    </div>
    <div style="border: 1px solid #e5e5e5; border-top: none; padding: 24px; border-radius: 0 0 6px 6px;">
      <p>Dear ${data.clientName},</p>
      <p>${headline}</p>
      <p>Amount due: <strong>${amount}</strong></p>
      <p style="margin-top: 24px;">Kind regards,<br/>${data.companyName}</p>
    </div>
  </div>`;

  return { subject, html, text };
}

export function renderLoginOtpEmail(data: { companyName: string; code: string }): { subject: string; html: string; text: string } {
  const subject = `Your ${data.companyName} sign-in code: ${data.code}`;
  const text = `Your sign-in code is ${data.code}. It expires in 10 minutes.\n\nIf you didn't try to sign in, you can safely ignore this email — your account is still secure.`;

  const html = `
  <div style="font-family: Arial, Helvetica, sans-serif; color: #1D1D1B; max-width: 480px; margin: 0 auto;">
    <div style="background: #C62435; padding: 20px 24px; border-radius: 6px 6px 0 0;">
      <span style="color: #ffffff; font-size: 18px; font-weight: bold;">${data.companyName}</span>
    </div>
    <div style="border: 1px solid #e5e5e5; border-top: none; padding: 24px; border-radius: 0 0 6px 6px; text-align: center;">
      <p style="margin: 0 0 8px;">Your sign-in code is:</p>
      <p style="font-size: 32px; font-weight: bold; letter-spacing: 6px; margin: 0 0 16px; color: #1D1D1B;">${data.code}</p>
      <p style="font-size: 13px; color: #6b6b68; margin: 0;">This code expires in 10 minutes.</p>
      <p style="font-size: 13px; color: #6b6b68; margin-top: 16px;">
        If you didn't try to sign in, you can safely ignore this email — your account is still secure.
      </p>
    </div>
  </div>`;

  return { subject, html, text };
}
