import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import { EmailService } from './email.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import {
  SubscriptionTrialExpiringEvent,
  PaymentFailedEvent,
  MemberExpiringEvent,
} from './email.events';
import {
  InvoiceCreatedEvent,
  JobStatusChangedEvent,
} from '../../core/events/crm.events';

type TenantWelcomePayload = {
  module: 'GYM' | 'MOBILE_SHOP' | 'DIGITAL_LEDGER';
  user: {
    id: string;
    email: string | null;
    fullName?: string | null;
  };
  tenant: {
    id: string;
    name: string;
  };
  data?: {
    promoCode?: string;
    message?: string;
  };
};

@Injectable()
export class EmailListener {
  private readonly logger = new Logger(EmailListener.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  @OnEvent('tenant.welcome')
  async handleTenantWelcome(event: TenantWelcomePayload) {
    if (!event.user.email) {
      this.logger.warn(
        `[TENANT WELCOME] No email found for user ${event.user.id}`,
      );
      return;
    }

    const baseUrl =
      event.module === 'MOBILE_SHOP'
        ? this.configService.get('ERP_FRONTEND_URL') || 'https://shop.REMOVED_DOMAIN'
        : event.module === 'DIGITAL_LEDGER'
          ? this.configService.get('LEDGER_FRONTEND_URL') || 'https://ledger.digitalled.in'
          : this.configService.get('GYM_FRONTEND_URL') || 'https://gym.mobibix.in';

    const appName =
      event.module === 'MOBILE_SHOP'
        ? 'MobiBix'
        : event.module === 'DIGITAL_LEDGER'
          ? 'DigitalLedger'
          : 'GymPilot';

    await this.emailService.send({
      tenantId: event.tenant.id,
      recipientType: 'TENANT',
      emailType: 'TENANT_WELCOME',
      referenceId: event.user.id, // Only one welcome per user
      module: event.module,
      to: event.user.email,
      subject: `Welcome to ${appName}! 🚀`,
      data: {
        name: event.user.fullName || 'User',
        tenantName: event.tenant.name,
        link: baseUrl,
        promoCode: event.data?.promoCode,
        promoDescription: event.data?.message,
      },
    });
  }

  @OnEvent('subscription.trial.expiring')
  async handleTrialExpiring(event: SubscriptionTrialExpiringEvent) {
    const { tenantId, module, subscription, daysLeft } = event;
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { users: { where: { role: 'OWNER' } } },
    });

    const ownerEmail = tenant?.users[0]?.email;
    if (!ownerEmail) {
      this.logger.warn(
        `[TRIAL EXPIRING] No owner email found for Tenant ${tenantId}`,
      );
      return;
    }

    const baseUrl = module === 'MOBILE_SHOP'
      ? this.configService.get('ERP_FRONTEND_URL') || 'https://shop.REMOVED_DOMAIN'
      : this.configService.get('GYM_FRONTEND_URL') || 'https://gym.mobibix.in';

    await this.emailService.send({
      tenantId,
      recipientType: 'TENANT',
      emailType: 'TRIAL_EXPIRING',
      referenceId: `TRIAL-EXP-WARNING-${subscription.id}`,
      module,
      to: ownerEmail,
      subject: `Your ${module === 'MOBILE_SHOP' ? 'MobiBix' : 'GymPilot'} Trial Expires in ${daysLeft} Days ⏳`,
      data: {
        tenantName: tenant.name,
        daysLeft,
        upgradeLink: `${baseUrl}/settings/billing`,
      },
    });
  }

  @OnEvent('member.expiring')
  async handleMemberExpiring(event: MemberExpiringEvent) {
    const { tenantId, module, member, expiryDate } = event;

    if (module !== 'GYM') return; // Safety check

    const baseUrl = this.configService.get('GYM_FRONTEND_URL') || 'https://gym.mobibix.in';

    await this.emailService.send({
      tenantId,
      recipientType: 'CUSTOMER', // Member is a customer in this context
      emailType: 'MEMBER_EXPIRING',
      referenceId: `${member.id}-EXP-${expiryDate.toISOString().split('T')[0]}`,
      module,
      to: member.phone + '@nomail.com',
      subject: `Your Gym Membership Expires Soon! ⏳`,
      data: {
        name: member.fullName,
        expiryDate: expiryDate.toDateString(),
        renewLink: `${baseUrl}/pay/${tenantId}/${member.id}`,
      },
    });
  }

  @OnEvent('payment.failed')
  async handlePaymentFailed(event: PaymentFailedEvent) {
    const { tenantId, module, payment, retryCount, nextRetry } = event;

    // We need to fetch owner email again or pass it?
    // Ideally we pass it in event but event constructor didn't have it.
    // Let's fetch tenant briefly or assume we can pass it in event data in future refactor.
    // For now, let's fast-fetch owner email to keep it clean, or update event.
    // Actually, let's fetch here to be safe and get fresh data.
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { users: { where: { role: 'OWNER' } } },
    });

    const ownerEmail = tenant?.users[0]?.email;
    if (!ownerEmail) return;

    const baseUrl = module === 'MOBILE_SHOP'
      ? this.configService.get('ERP_FRONTEND_URL') || 'https://shop.REMOVED_DOMAIN'
      : this.configService.get('GYM_FRONTEND_URL') || 'https://gym.mobibix.in';

    await this.emailService.send({
      tenantId,
      recipientType: 'TENANT',
      emailType: 'PAYMENT_FAILED',
      referenceId: `PAYFAIL-${payment.id}-${retryCount}`,
      module,
      to: ownerEmail,
      subject:
        retryCount >= 3
          ? 'Action Required: Subscription Suspended 🛑'
          : 'Payment Failed ❌',
      data: {
        tenantName: tenant.name,
        amount: payment.amount,
        currency: payment.currency,
        retryCount,
        nextRetry: nextRetry
          ? nextRetry.toDateString() + ' ' + nextRetry.toLocaleTimeString()
          : null,
        payLink: `${baseUrl}/settings/billing`,
      },
    });
  }

  @OnEvent('staff.invited')
  async handleStaffInvited(event: {
    tenantId: string;
    module: 'GYM' | 'MOBILE_SHOP';
    invite: any;
    inviterName: string;
  }) {
    const { tenantId, module, invite, inviterName } = event;

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    });

    const baseUrl =
      module === 'MOBILE_SHOP'
        ? this.configService.get('ERP_FRONTEND_URL') || 'https://shop.REMOVED_DOMAIN'
        : this.configService.get('GYM_FRONTEND_URL') || 'https://gym.mobibix.in';

    // The invite link depends on the frontend being able to handle the token
    const inviteLink = `${baseUrl}/onboarding?token=${invite.inviteToken}`;

    await this.emailService.send({
      tenantId,
      recipientType: 'STAFF',
      emailType: 'STAFF_INVITED',
      referenceId: invite.id,
      module,
      to: invite.email,
      subject: `You've been invited to join ${tenant?.name || 'a shop'} on ${module === 'MOBILE_SHOP' ? 'MobiBix' : 'GymPilot'}!`,
      data: {
        staffName: invite.name || 'Staff Member',
        inviterName: inviterName,
        role: invite.role, // Or resolve dynamic role name if available
        inviteLink: inviteLink,
      },
    });
  }

  @OnEvent('invoice.created')
  async handleInvoiceCreated(payload: InvoiceCreatedEvent) {
    const { tenantId, invoiceId, customerId } = payload;

    if (!customerId) return;

    const customer = await this.prisma.party.findUnique({
      where: { id: customerId },
      select: { email: true, name: true },
    });

    if (!customer?.email) return;

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    });

    await this.emailService.send({
      tenantId,
      recipientType: 'CUSTOMER',
      emailType: 'INVOICE_GENERATED',
      referenceId: invoiceId,
      module: 'MOBILE_SHOP',
      to: customer.email,
      subject: `Invoice generated for your purchase at ${tenant?.name || 'our shop'}`,
      data: {
        customerName: customer.name || 'Valued Customer',
        invoiceNumber: payload.invoiceNumber,
        amount: payload.amount,
        viewLink: `https://shop.REMOVED_DOMAIN/p/invoice/${invoiceId}`,
      },
    });
  }

  @OnEvent('job.created')
  async handleJobCreated(payload: {
    tenantId: string;
    jobId: string;
    jobNumber: string;
    customerName: string;
    customerPhone: string;
    deviceModel: string;
  }) {
    const { tenantId, jobId, jobNumber } = payload;

    // We try to find customer email
    const job = await this.prisma.jobCard.findUnique({
      where: { id: jobId },
      select: { customerId: true, publicToken: true },
    });

    let email: string | null = null;
    if (job?.customerId) {
      const party = await this.prisma.party.findUnique({
        where: { id: job.customerId },
        select: { email: true },
      });
      email = party?.email || null;
    }

    if (!email) return;

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    });

    await this.emailService.send({
      tenantId,
      recipientType: 'CUSTOMER',
      emailType: 'JOBCARD_CREATED',
      referenceId: jobId,
      module: 'MOBILE_SHOP',
      to: email,
      subject: `Service Request Received: ${jobNumber}`,
      data: {
        customerName: payload.customerName,
        jobNumber,
        deviceModel: payload.deviceModel,
        shopName: tenant?.name || 'MobiBix Shop',
        statusLink: `https://shop.REMOVED_DOMAIN/p/status/${job?.publicToken}`,
      },
    });
  }

  @OnEvent('job.status.changed')
  async handleJobStatusChanged(payload: JobStatusChangedEvent) {
    const { tenantId, jobId, status } = payload;

    const job = await this.prisma.jobCard.findUnique({
      where: { id: jobId },
      select: { jobNumber: true, customerId: true, publicToken: true },
    });

    let email: string | null = null;
    let customerName = 'Valued Customer';

    if (job?.customerId) {
      const party = await this.prisma.party.findUnique({
        where: { id: job.customerId },
        select: { email: true, name: true },
      });
      email = party?.email || null;
      customerName = party?.name || customerName;
    }

    if (!email) return;

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    });

    let emailType: any = 'JOBCARD_STATUS_UPDATED';
    let subject = `Job Status Update: ${job?.jobNumber}`;

    if (status === 'READY') {
      subject = `Your device is ready for pickup! - ${job?.jobNumber}`;
    } else if (status === 'DELIVERED') {
      emailType = 'JOBCARD_COMPLETED';
      subject = `Service Completed: ${job?.jobNumber} - Thank you!`;
    }

    await this.emailService.send({
      tenantId,
      recipientType: 'CUSTOMER',
      emailType,
      referenceId: `${jobId}-${status}`,
      module: 'MOBILE_SHOP',
      to: email,
      subject,
      data: {
        customerName,
        jobNumber: job?.jobNumber,
        status,
        deviceModel: payload.deviceModel,
        shopName: tenant?.name || 'MobiBix Shop',
        statusLink: `https://shop.REMOVED_DOMAIN/p/status/${job?.publicToken}`,
      },
    });
  }
}
