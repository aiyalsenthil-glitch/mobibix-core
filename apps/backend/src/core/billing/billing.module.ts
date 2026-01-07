import { Module } from '@nestjs/common';
import { PlansModule } from './plans/plans.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { SubscriptionGuard } from './guards/subscription.guard';
import { PaymentsModule } from './payments/payments.module';
import { SubscriptionExpiryCron } from './subscriptions/subscription-expiry.cron';

@Module({
  imports: [
    PlansModule,
    SubscriptionsModule,
    PaymentsModule, // ✅ CORRECT
  ],
  providers: [SubscriptionGuard, SubscriptionExpiryCron],
  exports: [
    PlansModule,
    SubscriptionsModule,
    SubscriptionGuard,
    PaymentsModule, // optional
  ],
})
export class BillingModule {}
