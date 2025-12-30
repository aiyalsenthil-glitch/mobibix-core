import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { TenantModule } from '../tenant/tenant.module';
import { BillingModule } from '../billing/billing.module';
import { AuthModule } from '../auth/auth.module';
import { PlansModule } from '../billing/plans/plans.module';
import { AdminWebhooksController } from './admin-webhooks.controller';

@Module({
  imports: [AuthModule, TenantModule, BillingModule, PlansModule],
  controllers: [AdminController, AdminWebhooksController],
})
export class AdminModule {}
