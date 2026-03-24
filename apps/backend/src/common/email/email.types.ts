import { ModuleType } from '@prisma/client';

export type EmailRecipientType = 'TENANT' | 'STAFF' | 'CUSTOMER' | 'ADMIN' | 'LEAD';

export interface EmailAttachment {
  filename: string;
  content?: Buffer | string;
  path?: string;
  contentType?: string;
}

export interface SendEmailOptions {
  tenantId: string | null;
  recipientType: EmailRecipientType;
  emailType: string;
  referenceId: string;
  module: ModuleType;
  senderPrefix?: string; // e.g. "support", "billing", "noreply"

  to: string;
  subject: string;

  // Data to render template (React Email props)
  data: unknown;

  attachments?: EmailAttachment[];
}
