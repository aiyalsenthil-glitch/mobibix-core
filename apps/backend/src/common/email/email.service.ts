import * as React from 'react';
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
import { TrialOnboardingDay1Email } from './templates/tenant/trial-onboarding-day1';
import { TrialOnboardingDay3Email } from './templates/tenant/trial-onboarding-day3';
import { TrialOnboardingDay5Email } from './templates/tenant/trial-onboarding-day5';
import { TrialOnboardingDay7Email } from './templates/tenant/trial-onboarding-day7';
import { TrialOnboardingDay10Email } from './templates/tenant/trial-onboarding-day10';
import { TrialOnboardingDay12Email } from './templates/tenant/trial-onboarding-day12';

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
import { DeletionRequestAdminEmail } from './templates/admin/deletion-request';

import { ModuleType } from '@prisma/client';
import { EmailTemplateType } from './email-template-types';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resendMobiBix: Resend | null = null;
  private resendGymPilot: Resend | null = null;
  private resendDefault: Resend;

  constructor(private readonly prisma: PrismaService) {
    // 1. Initialize default Resend (legacy or fallback)
    const defaultKey = process.env.RESEND_API_KEY;
    if (!defaultKey) {
      this.logger.warn('RESEND_API_KEY is not set. Email sending will fail if specifics are missing.');
    }
    this.resendDefault = new Resend(defaultKey || 'fake_key');

    // 2. Initialize brand-specific Resends
    if (process.env.RESEND_API_KEY_MOBIBIX) {
      this.resendMobiBix = new Resend(process.env.RESEND_API_KEY_MOBIBIX);
      this.logger.log('📩 Resend [MobiBix] initialized');
    }

    if (process.env.RESEND_API_KEY_GYMPILOT) {
      this.resendGymPilot = new Resend(process.env.RESEND_API_KEY_GYMPILOT);
      this.logger.log('📩 Resend [GymPilot] initialized');
    }
  }

  /**
   * Safe email sending with Idempotency & Logging
   */
  async send(options: SendEmailOptions): Promise<void> {
    const {
      tenantId,
      recipientType,
      emailType,
      referenceId,
      module,
      to,
      subject,
      data,
      attachments,
    } = options;

    // 1️⃣ SAFETY CHECKS
    if (!to) {
      this.logger.warn(
        `Skipping email [${emailType}] for [${referenceId}]: No recipient address.`,
      );
      return;
    }

    if (recipientType === 'CUSTOMER' && to.includes('@nomail.com')) {
      this.logger.warn(
        `Skipping customer email [${emailType}]: Placeholder email '${to}'`,
      );
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
          module,
        },
      },
    });

    if (existingLog && existingLog.status === 'SENT') {
      this.logger.log(
        `[IDEMPOTENT] Skipping duplicate email: ${emailType} -> ${to} (Ref: ${referenceId})`,
      );
      return;
    }

    // 3️⃣ RENDER TEMPLATE
    let html = '';
    try {
      const template = this.getTemplateComponent(
        emailType as EmailTemplateType,
        module,
        data,
      );
      if (!template) {
        throw new Error(`Template not found for type: ${emailType}`);
      }
      html = await render(template);
    } catch (renderErr: unknown) {
      const message =
        renderErr instanceof Error ? renderErr.message : 'Unknown render error';
      this.logger.error(`[RENDER FAILED] ${message}`);
      await this.logResult(options, 'FAILED', `Render Error: ${message}`);
      return;
    }

    try {
      // 4️⃣ SELECT CORRECT RESEND INSTANCE
      let resendInstance = this.resendDefault;
      if (module === 'GYM' && this.resendGymPilot) {
        resendInstance = this.resendGymPilot;
      } else if (
        (module === 'MOBILE_SHOP' || module === 'MOBILE_REPAIR') &&
        this.resendMobiBix
      ) {
        resendInstance = this.resendMobiBix;
      }

      // 5️⃣ SEND VIA RESEND
      const fromAddress = this.getSenderAddress(module, emailType);
      
      this.logger.log(`📧 [ROUTING] Account: ${resendInstance === this.resendMobiBix ? 'MobiBix' : resendInstance === this.resendGymPilot ? 'GymPilot' : 'Default'}`);
      this.logger.log(`📧 [ROUTING] From: ${fromAddress}`);

      const response = await resendInstance.emails.send({
        from: fromAddress,
        to,
        subject,
        html,
        attachments: attachments?.map((a) => ({
          filename: a.filename,
          content: a.content,
        })),
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      // 6️⃣ LOG SUCCESS
      await this.logResult(options, 'SENT', null);
      this.logger.log(`[SENT] Email ${emailType} sent to ${to}`);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Unknown email error';
      this.logger.error(`[FAILED] Email ${emailType} failed: ${message}`);
      await this.logResult(options, 'FAILED', message);
    }
  }

  private getTemplateComponent(
    type: EmailTemplateType,
    module: ModuleType,
    data: unknown,
  ): React.ReactElement | null {
    const payload = (data ?? {}) as Record<string, unknown>;
    // Validate paths and imports match folder structure
    switch (type) {
      // Tenant
      case 'TENANT_WELCOME':
        return WelcomeEmail({
          module,
          ...(payload as Omit<Parameters<typeof WelcomeEmail>[0], 'module'>),
        });
      case 'TRIAL_STARTED':
        return TrialStartedEmail({
          module,
          ...(payload as Omit<
            Parameters<typeof TrialStartedEmail>[0],
            'module'
          >),
        });
      case 'TRIAL_EXPIRING':
        return TrialExpiringEmail({
          module,
          ...(payload as Omit<
            Parameters<typeof TrialExpiringEmail>[0],
            'module'
          >),
        });
      case 'TRIAL_EXPIRED':
        return TrialExpiredEmail({
          module,
          ...(payload as Omit<
            Parameters<typeof TrialExpiredEmail>[0],
            'module'
          >),
        });
      case 'PLAN_UPGRADED':
        return PlanUpgradedEmail({
          module,
          ...(payload as Omit<
            Parameters<typeof PlanUpgradedEmail>[0],
            'module'
          >),
        });
      case 'PLAN_DOWNGRADED':
        return PlanDowngradedEmail({
          module,
          ...(payload as Omit<
            Parameters<typeof PlanDowngradedEmail>[0],
            'module'
          >),
        });
      case 'SUBSCRIPTION_ACTIVATED':
        return SubscriptionActivatedEmail({
          module,
          ...(payload as Omit<
            Parameters<typeof SubscriptionActivatedEmail>[0],
            'module'
          >),
        });
      case 'SUBSCRIPTION_HALTED':
        return SubscriptionHaltedEmail({
          module,
          ...(payload as Omit<
            Parameters<typeof SubscriptionHaltedEmail>[0],
            'module'
          >),
        });
      case 'PAYMENT_SUCCESS':
        return PaymentSuccessEmail({
          module,
          ...(payload as Omit<
            Parameters<typeof PaymentSuccessEmail>[0],
            'module'
          >),
        });
      case 'PAYMENT_FAILED':
        return PaymentFailedEmail({
          module,
          ...(payload as Omit<
            Parameters<typeof PaymentFailedEmail>[0],
            'module'
          >),
        });
      case 'TRIAL_ONBOARDING_DAY1':
        return TrialOnboardingDay1Email({
          module,
          ...(payload as Omit<
            Parameters<typeof TrialOnboardingDay1Email>[0],
            'module'
          >),
        });
      case 'TRIAL_ONBOARDING_DAY3':
        return TrialOnboardingDay3Email({
          module,
          ...(payload as Omit<
            Parameters<typeof TrialOnboardingDay3Email>[0],
            'module'
          >),
        });
      case 'TRIAL_ONBOARDING_DAY5':
        return TrialOnboardingDay5Email({
          module,
          ...(payload as Omit<
            Parameters<typeof TrialOnboardingDay5Email>[0],
            'module'
          >),
        });
      case 'TRIAL_ONBOARDING_DAY7':
        return TrialOnboardingDay7Email({
          module,
          ...(payload as Omit<
            Parameters<typeof TrialOnboardingDay7Email>[0],
            'module'
          >),
        });
      case 'TRIAL_ONBOARDING_DAY10':
        return TrialOnboardingDay10Email({
          module,
          ...(payload as Omit<
            Parameters<typeof TrialOnboardingDay10Email>[0],
            'module'
          >),
        });
      case 'TRIAL_ONBOARDING_DAY12':
        return TrialOnboardingDay12Email({
          module,
          ...(payload as Omit<
            Parameters<typeof TrialOnboardingDay12Email>[0],
            'module'
          >),
        });

      // Staff
      case 'STAFF_INVITED':
        return StaffInvitedEmail({
          module,
          ...(payload as Omit<
            Parameters<typeof StaffInvitedEmail>[0],
            'module'
          >),
        });

      // Member
      case 'MEMBER_EXPIRING':
        return MemberExpiringEmail({
          module,
          ...(payload as Omit<
            Parameters<typeof MemberExpiringEmail>[0],
            'module'
          >),
        });
      case 'MEMBERSHIP_EXPIRED':
        return MembershipExpiredEmail({
          module,
          ...(payload as Omit<
            Parameters<typeof MembershipExpiredEmail>[0],
            'module'
          >),
        });
      case 'MEMBERSHIP_RENEWAL_SUCCESS':
        return MembershipRenewalSuccessEmail({
          module,
          ...(payload as Omit<
            Parameters<typeof MembershipRenewalSuccessEmail>[0],
            'module'
          >),
        });

      // Customer
      case 'INVOICE_GENERATED':
        return InvoiceGeneratedEmail({
          module,
          ...(payload as Omit<
            Parameters<typeof InvoiceGeneratedEmail>[0],
            'module'
          >),
        });
      case 'PAYMENT_RECEIPT':
        return PaymentReceiptEmail({
          module,
          ...(payload as Omit<
            Parameters<typeof PaymentReceiptEmail>[0],
            'module'
          >),
        });
      case 'JOBCARD_CREATED':
        return JobcardCreatedEmail({
          module,
          ...(payload as Omit<
            Parameters<typeof JobcardCreatedEmail>[0],
            'module'
          >),
        });
      case 'JOBCARD_STATUS_UPDATED':
        return JobcardStatusUpdatedEmail({
          module,
          ...(payload as Omit<
            Parameters<typeof JobcardStatusUpdatedEmail>[0],
            'module'
          >),
        });
      case 'JOBCARD_COMPLETED':
        return JobcardCompletedEmail({
          module,
          ...(payload as Omit<
            Parameters<typeof JobcardCompletedEmail>[0],
            'module'
          >),
        });

      // System
      case 'EMAIL_VERIFICATION':
        return EmailVerificationEmail({
          module,
          ...(payload as Omit<
            Parameters<typeof EmailVerificationEmail>[0],
            'module'
          >),
        });
      case 'DELETION_REQUEST':
        return DeletionRequestAdminEmail({
          module,
          ...(payload as Omit<
            Parameters<typeof DeletionRequestAdminEmail>[0],
            'module'
          >),
        });

      default:
        this.logger.warn(`Unknown email template type: ${String(type)}`);
        return null;
    }
  }

  private async logResult(
    options: SendEmailOptions,
    status: 'SENT' | 'FAILED',
    error: string | null,
  ) {
    const { tenantId, recipientType, emailType, referenceId, module, to } =
      options;

    await this.prisma.emailLog.upsert({
      where: {
        idempotency_key: {
          tenantId,
          recipientType: recipientType as any,
          emailType,
          referenceId,
          module,
        },
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
        retryCount: status === 'FAILED' ? 0 : 0,
      },
      update: {
        status: status as EmailStatus,
        sentAt: status === 'SENT' ? new Date() : null,
        error,
        updatedAt: new Date(),
      },
    });
  }

  private getSenderAddress(module: ModuleType, type: string): string {
    const isMobiBix = module === 'MOBILE_SHOP' || module === 'MOBILE_REPAIR';
    const isLedger = (module as string) === 'DIGITAL_LEDGER';
    const domain = isMobiBix ? 'REMOVED_DOMAIN' : isLedger ? 'mobibix.in' : 'mobibix.in';
    const brandName = isMobiBix ? 'MobiBix' : isLedger ? 'DigitalLedger' : 'GymPilot';

    // 1. BILLING EMAILS
    const billingTypes = [
      'PAYMENT_SUCCESS',
      'PAYMENT_FAILED',
      'INVOICE_GENERATED',
      'PAYMENT_RECEIPT',
      'PLAN_UPGRADED',
      'PLAN_DOWNGRADED',
      'SUBSCRIPTION_ACTIVATED',
    ];
    if (billingTypes.includes(type)) {
      return `${brandName} Billing <billing@${domain}>`;
    }

    // 2. SUPPORT & ONBOARDING
    const supportTypes = [
      'TENANT_WELCOME',
      'TRIAL_STARTED',
      'STAFF_INVITED',
      'TRIAL_ONBOARDING_DAY1',
      'TRIAL_ONBOARDING_DAY3',
      'TRIAL_ONBOARDING_DAY10',
    ];
    if (supportTypes.includes(type)) {
      return `${brandName} Team <hello@${domain}>`;
    }

    // 3. SECURITY & UPDATES (Default)
    return `${brandName} <noreply@${domain}>`;
  }
}
