import { Module } from '@nestjs/common';
import { PlansModule } from './plans/plans.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { SubscriptionGuard } from '../auth/guards/subscription.guard';
import { PaymentsModule } from './payments/payments.module';
import { InvoiceModule } from './invoices/invoice.module';
import { SubscriptionExpiryCron } from './subscriptions/subscription-expiry.cron';
import { MailModule } from '../../common/email/mail.module';
import { EmailService } from '../../common/email/email.service';
import { PlanRulesService } from './plan-rules.service';
import { PlanMappingService } from './plan-mapping.service';
import { RazorpayWebhookController } from './REMOVED_PAYMENT_INFRA.webhook.controller';
import { AutoRenewCronService } from './auto-renew.cron';
// NOTE: PaymentExpiryCronService removed — payments.module registers PaymentCleanupCron for this (avoids duplicate)

import { BullModule } from '@nestjs/bullmq';
import { RazorpayWebhookProcessor } from './REMOVED_PAYMENT_INFRA.webhook.processor';
import { billingMetricsProviders } from './metrics.providers';
import { AiGovernanceService } from './ai-governance.service';
import { ReconciliationCron } from './reconciliation.cron';

@Module({
  imports: [
    PlansModule,
    SubscriptionsModule,
    PaymentsModule, // ✅ CORRECT
    InvoiceModule,
    MailModule,
    BullModule.registerQueue({
      name: 'REMOVED_PAYMENT_INFRA-webhooks',
    }),
  ],
  providers: [
    SubscriptionGuard,
    SubscriptionExpiryCron,
    PlanRulesService,
    PlanMappingService,
    AutoRenewCronService,
    // PaymentExpiryCronService REMOVED — duplicate of PaymentCleanupCron in payments.module
    RazorpayWebhookProcessor,
    AiGovernanceService,
    ReconciliationCron,
    ...billingMetricsProviders,
  ],
  controllers: [RazorpayWebhookController],
  exports: [
    PlansModule,
    SubscriptionsModule,
    SubscriptionGuard,
    PaymentsModule, // optional
    InvoiceModule,
    PlanRulesService,
    PlanMappingService,
    AiGovernanceService,
  ],
})
export class BillingModule {}
