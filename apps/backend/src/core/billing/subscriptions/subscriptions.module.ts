import { Module, forwardRef } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { AuthModule } from '../../auth/auth.module';
import { PlanPriceService } from '../plan-price.service';
import { PlansModule } from '../plans/plans.module';
import { RazorpayService } from '../REMOVED_PAYMENT_INFRA.service';
import { SubscriptionExpiryCron } from './subscription-expiry.cron';
import { MemberExpiryCron } from './member-expiry.cron';

@Module({
  imports: [AuthModule, forwardRef(() => PlansModule)],
  providers: [
    SubscriptionsService, 
    PlanPriceService, 
    RazorpayService,
    SubscriptionExpiryCron,
    MemberExpiryCron
  ],
  controllers: [SubscriptionsController],
  exports: [SubscriptionsService, RazorpayService],
})
export class SubscriptionsModule {}
