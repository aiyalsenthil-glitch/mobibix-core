import { Module, forwardRef } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { AuthModule } from '../../auth/auth.module';
import { PlanPriceService } from '../plan-price.service';
import { PlansModule } from '../plans/plans.module';
import { RazorpayService } from '../REMOVED_PAYMENT_INFRA.service';
import { SubscriptionExpiryCron } from './subscription-expiry.cron';
import { MemberExpiryCron } from './member-expiry.cron';
import { makeCounterProvider } from '@willsoto/nestjs-prometheus';

@Module({
  imports: [AuthModule, forwardRef(() => PlansModule)],
  providers: [
    SubscriptionsService,
    PlanPriceService,
    RazorpayService,
    SubscriptionExpiryCron,
    MemberExpiryCron,
    makeCounterProvider({
      name: 'renewals_success_total',
      help: 'Total number of successful renewals',
      labelNames: ['planId'],
    }),
    makeCounterProvider({
      name: 'renewals_failed_total',
      help: 'Total number of failed renewals',
      labelNames: ['planId'],
    }),
  ],
  controllers: [SubscriptionsController],
  exports: [SubscriptionsService, RazorpayService],
})
export class SubscriptionsModule {}
