
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { Resend } from 'resend';
import { render } from '@react-email/render';
import { SendEmailOptions } from './email.types';
import { EmailStatus } from '@prisma/client';

// Templates
// Templates
import { WelcomeEmail } from './templates/tenant/welcome';
import { TrialStartedEmail } from './templates/tenant/trial-started';
import { TrialExpiringEmail } from './templates/tenant/trial-expiring';
import { TrialExpiredEmail } from './templates/tenant/trial-expired';
import { PlanUpgradedEmail } from './templates/tenant/plan-upgraded';
import { PlanDowngradedEmail } from './templates/tenant/plan-downgraded';
import { SubscriptionActivatedEmail } from './templates/tenant/subscription-activated';
import { SubscriptionHaltedEmail } from './templates/tenant/subscription-halted';
import { PaymentSuccessEmail } from './templates/tenant/payment-success';
import { PaymentFailedEmail } from './templates/tenant/payment-failed';

import { StaffInvitedEmail } from './templates/staff/staff-invited';

import { MemberExpiringEmail } from './templates/members/member-expiring';
import { MembershipExpiredEmail } from './templates/members/membership-expired';
import { MembershipRenewalSuccessEmail } from './templates/members/membership-renewal-success';

import { InvoiceGeneratedEmail } from './templates/customer/invoice-generated';
import { PaymentReceiptEmail } from './templates/customer/payment-receipt';
import { JobcardCreatedEmail } from './templates/customer/jobcard-created';
import { JobcardStatusUpdatedEmail } from './templates/customer/jobcard-status-updated';
import { JobcardCompletedEmail } from './templates/customer/jobcard-completed';

import { EmailVerificationEmail } from './templates/system/email-verification';

import { ModuleType } from '@prisma/client';
import { EmailTemplateType } from './email-template-types';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend;

  constructor(private readonly prisma: PrismaService) {
    if (!process.env.RESEND_API_KEY) {
      this.logger.warn('RESEND_API_KEY is not set. Email sending will fail.');
    }
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  /**
   * Safe email sending with Idempotency & Logging
   */
  async send(options: SendEmailOptions): Promise<void> {
    const { tenantId, recipientType, emailType, referenceId, module, to, subject, data, attachments } = options;

    // 1️⃣ SAFETY CHECKS
    if (!to) {
      this.logger.warn(`Skipping email [${emailType}] for [${referenceId}]: No recipient address.`);
      return;
    }

    if (recipientType === 'CUSTOMER' && to.includes('@nomail.com')) {
       this.logger.warn(`Skipping customer email [${emailType}]: Placeholder email '${to}'`);
       return;
    }

    // 2️⃣ IDEMPOTENCY CHECK (Database Guard)
    const existingLog = await this.prisma.emailLog.findUnique({
      where: {
        idempotency_key: {
          tenantId,
          recipientType: recipientType as any,
          emailType,
          referenceId,
          module
        }
      }
    });

    if (existingLog && existingLog.status === 'SENT') {
      this.logger.log(`[IDEMPOTENT] Skipping duplicate email: ${emailType} -> ${to} (Ref: ${referenceId})`);
      return;
    }

    // 3️⃣ RENDER TEMPLATE
    let html = '';
    try {
        const template = this.getTemplateComponent(emailType as EmailTemplateType, module, data);
        if (!template) {
            throw new Error(`Template not found for type: ${emailType}`);
        }
        html = await render(template);
    } catch (renderErr: any) {
        this.logger.error(`[RENDER FAILED] ${renderErr.message}`);
        await this.logResult(options, 'FAILED', `Render Error: ${renderErr.message}`);
        return;
    }

    try {
      // 4️⃣ SEND VIA RESEND
      const fromAddress = this.getSenderAddress(module);
      
      const response = await this.resend.emails.send({
        from: fromAddress,
        to,
        subject,
        html,
        attachments: attachments?.map(a => ({ 
            filename: a.filename, 
            content: a.content 
        }))
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      // 5️⃣ LOG SUCCESS
      await this.logResult(options, 'SENT', null);
      this.logger.log(`[SENT] Email ${emailType} sent to ${to}`);

    } catch (err: any) {
      this.logger.error(`[FAILED] Email ${emailType} failed: ${err.message}`);
      await this.logResult(options, 'FAILED', err.message);
    }
  }

  private getTemplateComponent(type: EmailTemplateType, module: ModuleType, data: any): React.ReactElement | null {
      // Validate paths and imports match folder structure
      switch (type) {
          // Tenant
          case 'TENANT_WELCOME':
              return WelcomeEmail({ module, ...data });
          case 'TRIAL_STARTED':
              return TrialStartedEmail({ module, ...data });
          case 'TRIAL_EXPIRING':
              return TrialExpiringEmail({ module, ...data });
          case 'TRIAL_EXPIRED':
              return TrialExpiredEmail({ module, ...data });
          case 'PLAN_UPGRADED':
              return PlanUpgradedEmail({ module, ...data });
          case 'PLAN_DOWNGRADED':
              return PlanDowngradedEmail({ module, ...data });
          case 'SUBSCRIPTION_ACTIVATED':
              return SubscriptionActivatedEmail({ module, ...data });
          case 'SUBSCRIPTION_HALTED':
              return SubscriptionHaltedEmail({ module, ...data });
          case 'PAYMENT_SUCCESS':
              return PaymentSuccessEmail({ module, ...data });
          case 'PAYMENT_FAILED':
              return PaymentFailedEmail({ module, ...data });

          // Staff
          case 'STAFF_INVITED':
              return StaffInvitedEmail({ module, ...data });

          // Member
          case 'MEMBER_EXPIRING':
              return MemberExpiringEmail({ module, ...data });
          case 'MEMBERSHIP_EXPIRED':
              return MembershipExpiredEmail({ module, ...data });
          case 'MEMBERSHIP_RENEWAL_SUCCESS':
              return MembershipRenewalSuccessEmail({ module, ...data });

          // Customer
          case 'INVOICE_GENERATED':
              return InvoiceGeneratedEmail({ module, ...data });
          case 'PAYMENT_RECEIPT':
              return PaymentReceiptEmail({ module, ...data });
          case 'JOBCARD_CREATED':
              return JobcardCreatedEmail({ module, ...data });
          case 'JOBCARD_STATUS_UPDATED':
              return JobcardStatusUpdatedEmail({ module, ...data });
          case 'JOBCARD_COMPLETED':
              return JobcardCompletedEmail({ module, ...data });

          // System
          case 'EMAIL_VERIFICATION':
              return EmailVerificationEmail({ module, ...data });

          default:
              this.logger.warn(`Unknown email template type: ${type}`);
              return null;
      }
  }

  private async logResult(options: SendEmailOptions, status: 'SENT' | 'FAILED', error: string | null) {
      const { tenantId, recipientType, emailType, referenceId, module, to } = options;
      
      await this.prisma.emailLog.upsert({
          where: {
              idempotency_key: {
                  tenantId,
                  recipientType: recipientType as any,
                  emailType,
                  referenceId,
                  module
              }
          },
          create: {
              tenantId,
              recipientType: recipientType as any,
              recipientEmail: to,
              emailType,
              referenceId,
              module,
              subject: options.subject,
              status: status as EmailStatus,
              sentAt: status === 'SENT' ? new Date() : null,
              error,
              retryCount: status === 'FAILED' ? 0 : 0
          },
          update: {
              status: status as EmailStatus,
              sentAt: status === 'SENT' ? new Date() : null,
              error,
              updatedAt: new Date()
          }
      });
  }

  private getSenderAddress(module: ModuleType): string {
    // In production, ensure these domains are verified in Resend
    if (module === 'MOBILE_SHOP') {
      return process.env.EMAIL_FROM_MOBIBIX || 'MobiBix <notifications@mobibix.com>';
    }
    return process.env.EMAIL_FROM_GYMPILOT || 'GymPilot <notifications@mobibix.in>';
  }
}
