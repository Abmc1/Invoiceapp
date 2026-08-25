import "server-only";
import type { EmailMessage, EmailProvider, EmailSendResult } from "./provider";

/**
 * Development / no-configuration fallback. Logs the email to the server
 * console instead of sending it, and honestly reports `mocked: true` so
 * calling code (and audit trail) never claims a delivery that didn't
 * happen. Selected automatically whenever EMAIL_PROVIDER is unset or "mock".
 */
export class MockEmailProvider implements EmailProvider {
  readonly name = "mock";

  async send(message: EmailMessage): Promise<EmailSendResult> {
    console.log("\n[email:mock] No email provider configured — logging instead of sending.");
    console.log(`[email:mock] To: ${message.to}`);
    console.log(`[email:mock] Subject: ${message.subject}`);
    console.log(`[email:mock] Attachments: ${(message.attachments ?? []).map((a) => a.filename).join(", ") || "none"}`);
    console.log(`[email:mock] --- text body ---\n${message.text}\n`);

    return { success: true, provider: this.name, mocked: true };
  }
}
