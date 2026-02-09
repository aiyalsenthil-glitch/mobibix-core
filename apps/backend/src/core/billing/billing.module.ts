import { Module } from '@nestjs/common';
import { PlansModule } from './plans/plans.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { SubscriptionGuard } from './guards/subscription.guard';
import { PaymentsModule } from './payments/payments.module';
import { SubscriptionExpiryCron } from './subscriptions/subscription-expiry.cron';
import { MailModule } from '../../common/email/mail.module';
import { EmailService } from '../../common/email/email.service';
import { PlanRulesService } from './plan-rules.service';
import { PlanMappingService } from './plan-mapping.service';

@Module({
  imports: [
    PlansModule,
    SubscriptionsModule,
    PaymentsModule, // ✅ CORRECT
    MailModule,
  ],
  providers: [
    SubscriptionGuard,
    SubscriptionExpiryCron,
    PlanRulesService,
    PlanMappingService,
  ],
  exports: [
    PlansModule,
    SubscriptionsModule,
    SubscriptionGuard,
    PaymentsModule, // optional
    PlanRulesService,
    PlanMappingService,
  ],
})
export class BillingModule {}
