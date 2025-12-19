import { Module } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { TenantController } from './tenant.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { BillingModule } from '../billing/billing.module';
import { PlansModule } from '../billing/plans/plans.module';

@Module({
  imports: [PrismaModule, AuthModule, BillingModule, PlansModule],
  controllers: [TenantController],
  providers: [TenantService],
  exports: [TenantService], // 👈 THIS IS THE KEY LINE
})
export class TenantModule {}
