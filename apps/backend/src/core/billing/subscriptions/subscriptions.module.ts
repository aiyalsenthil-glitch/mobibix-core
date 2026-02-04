import { Module } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { AuthModule } from '../../auth/auth.module';
import { PlanPriceService } from '../plan-price.service';

@Module({
  imports: [AuthModule],
  providers: [SubscriptionsService, PlanPriceService],
  controllers: [SubscriptionsController],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
