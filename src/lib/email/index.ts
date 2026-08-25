import "server-only";
import type { EmailProvider } from "./provider";
import { MockEmailProvider } from "./mock-provider";

export type { EmailAttachment, EmailMessage, EmailProvider, EmailSendResult } from "./provider";

/**
 * Selects the email provider based on EMAIL_PROVIDER. Defaults to the mock
 * provider (logs instead of sending) so the app never silently requires
 * credentials that haven't been configured yet — see Settings > Email.
 */
export async function getEmailProvider(): Promise<EmailProvider> {
  const providerName = process.env.EMAIL_PROVIDER ?? "mock";

  if (providerName === "smtp") {
    // Lazy import so the smtp module (and its env var checks) only run when selected.
    const { SmtpEmailProvider } = await import("./smtp-provider");
    return new SmtpEmailProvider();
  }

  return new MockEmailProvider();
}
