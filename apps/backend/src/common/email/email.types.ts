import { ModuleType } from '@prisma/client';

export type EmailrecipientType = 'TENANT' | 'STAFF' | 'CUSTOMER';

export interface EmailAttachment {
  filename: string;
  content?: Buffer | string;
  path?: string;
  contentType?: string;
}

export interface SendEmailOptions {
  tenantId: string;
  recipientType: EmailrecipientType;
  emailType: string;
  referenceId: string;
  module: ModuleType;

  to: string;
  subject: string;

  // Data to render template (React Email props)
  data: unknown;

  attachments?: EmailAttachment[];
}
