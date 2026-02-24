
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EmailService } from './email.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { 
  SubscriptionTrialExpiringEvent, 
  SubscriptionTrialExpiredEvent, 
  PaymentSuccessEvent, 
  PaymentFailedEvent, 
  MemberExpiringEvent,
  TenantWelcomeEvent
} from './email.events';
import { User, Tenant } from '@prisma/client';

@Injectable()
export class EmailListener {
  private readonly logger = new Logger(EmailListener.name);

  constructor(
      private readonly emailService: EmailService,
      private readonly prisma: PrismaService
  ) {}

  @OnEvent('tenant.welcome')
  async handleTenantWelcome(event: TenantWelcomeEvent) {
    const { tenant, user, module } = event;
    
    await this.emailService.send({
      tenantId: tenant.id,
      recipientType: 'TENANT',
      emailType: 'TENANT_WELCOME',
      referenceId: user.id, // Only one welcome per user
      module,
      to: user.email!,
      subject: `Welcome to ${module === 'MOBILE_SHOP' ? 'MobiBix' : 'GymPilot'}! 🚀`,
      data: {
        name: user.fullName || 'User',
        link: `https://${module === 'MOBILE_SHOP' ? 'shop' : 'gym'}.mobibix.in`
      }
    });
  }

  @OnEvent('subscription.trial.expiring')
  async handleTrialExpiring(event: SubscriptionTrialExpiringEvent) {
    const { tenantId, module, subscription, daysLeft } = event;
    const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        include: { users: { where: { role: 'OWNER' } } }
    });
    
    const ownerEmail = tenant?.users[0]?.email;
    if (!ownerEmail) {
        this.logger.warn(`[TRIAL EXPIRING] No owner email found for Tenant ${tenantId}`);
        return;
    }

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
             upgradeLink: `https://${module === 'MOBILE_SHOP' ? 'shop' : 'gym'}.mobibix.in/settings/billing`
        }
    });
  }

  @OnEvent('member.expiring')
  async handleMemberExpiring(event: MemberExpiringEvent) {
    const { tenantId, module, member, expiryDate } = event;
    
    if (module !== 'GYM') return; // Safety check

    await this.emailService.send({
      tenantId,
      recipientType: 'CUSTOMER', // Member is a customer in this context
      emailType: 'MEMBER_EXPIRING',
      referenceId: `${member.id}-EXP-${expiryDate.toISOString().split('T')[0]}`,
      module,
      to: member.phone + "@nomail.com", 
      subject: `Your Gym Membership Expires Soon! ⏳`,
      data: {
        name: member.fullName,
        expiryDate: expiryDate.toDateString(),
        renewLink: `https://mobibix.in/pay/${tenantId}/${member.id}`
      }
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
        include: { users: { where: { role: 'OWNER' } } }
    });
    
    const ownerEmail = tenant?.users[0]?.email;
    if (!ownerEmail) return;

    await this.emailService.send({
        tenantId,
        recipientType: 'TENANT',
        emailType: 'PAYMENT_FAILED',
        referenceId: `PAYFAIL-${payment.id}-${retryCount}`,
        module,
        to: ownerEmail,
        subject: retryCount >= 3 ? 'Action Required: Subscription Suspended 🛑' : 'Payment Failed ❌',
        data: {
            tenantName: tenant.name,
            amount: payment.amount,
            currency: payment.currency,
            retryCount,
            nextRetry: nextRetry ? nextRetry.toDateString() + ' ' + nextRetry.toLocaleTimeString() : null,
            payLink: `https://${module === 'MOBILE_SHOP' ? 'shop' : 'gym'}.mobibix.in/settings/billing`
        }
    });
  }
}
