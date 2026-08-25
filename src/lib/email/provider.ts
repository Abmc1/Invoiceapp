import "server-only";

export interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
}

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: EmailAttachment[];
}

export interface EmailSendResult {
  success: boolean;
  provider: string;
  /** true when no real email provider is configured and the message was only logged, not delivered. */
  mocked: boolean;
  messageId?: string;
}

export interface EmailProvider {
  readonly name: string;
  send(message: EmailMessage): Promise<EmailSendResult>;
}
