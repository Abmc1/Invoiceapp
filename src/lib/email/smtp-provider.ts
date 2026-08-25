import "server-only";
import nodemailer from "nodemailer";
import type { EmailMessage, EmailProvider, EmailSendResult } from "./provider";

export class SmtpEmailProvider implements EmailProvider {
  readonly name = "smtp";
  private transporter: ReturnType<typeof nodemailer.createTransport>;
  private from: string;

  constructor() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT ?? 587);
    const user = process.env.SMTP_USER;
    const password = process.env.SMTP_PASSWORD;
    const from = process.env.EMAIL_FROM;

    if (!host || !from) {
      throw new Error(
        "EMAIL_PROVIDER=smtp but SMTP_HOST / EMAIL_FROM are not set. Configure them in your environment or switch EMAIL_PROVIDER back to 'mock'."
      );
    }

    this.from = from;
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user && password ? { user, pass: password } : undefined,
    });
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    const info = await this.transporter.sendMail({
      from: this.from,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
      attachments: message.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType,
      })),
    });

    return { success: true, provider: this.name, mocked: false, messageId: info.messageId };
  }
}
