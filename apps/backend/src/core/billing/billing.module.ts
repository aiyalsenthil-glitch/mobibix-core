import { Module } from '@nestjs/common';
import { PlansModule } from './plans/plans.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { SubscriptionGuard } from './guards/subscription.guard';

@Module({
  imports: [PlansModule, SubscriptionsModule],
  providers: [SubscriptionGuard],
  exports: [PlansModule, SubscriptionsModule, SubscriptionGuard],
})
export class BillingModule {}
