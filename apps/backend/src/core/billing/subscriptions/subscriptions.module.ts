import { Module, forwardRef } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { AuthModule } from '../../auth/auth.module';
import { PlanPriceService } from '../plan-price.service';
import { PlansModule } from '../plans/plans.module';

@Module({
  imports: [AuthModule, forwardRef(() => PlansModule)],
  providers: [SubscriptionsService, PlanPriceService],
  controllers: [SubscriptionsController],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
