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
import { PaymentExpiryCronService } from './payment-expiry.cron';

@Module({
  imports: [
    PlansModule,
    SubscriptionsModule,
    PaymentsModule, // ✅ CORRECT
    InvoiceModule,
    MailModule,
  ],
  providers: [
    SubscriptionGuard,
    SubscriptionExpiryCron,
    PlanRulesService,
    PlanMappingService,
    AutoRenewCronService,
    PaymentExpiryCronService,
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
  ],
})
export class BillingModule {}
