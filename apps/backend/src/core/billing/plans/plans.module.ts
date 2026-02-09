import { Module } from '@nestjs/common';
import { PlansController } from './plans.controller';
import { PlansService } from './plans.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { PlanMappingService } from '../plan-mapping.service';

@Module({
  imports: [PrismaModule, AuthModule, SubscriptionsModule],
  controllers: [PlansController],
  providers: [PlansService, PlanMappingService],
  exports: [PlansService], // ✅ REQUIRED
})
export class PlansModule {}
