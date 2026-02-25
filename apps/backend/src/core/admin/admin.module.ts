import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { TenantModule } from '../tenant/tenant.module';
import { BillingModule } from '../billing/billing.module';
import { AuthModule } from '../auth/auth.module';
import { PlansModule } from '../billing/plans/plans.module';
import { AdminWebhooksController } from './admin-webhooks.controller';
// import { PlatformController } from './platform.controller';
import { AuditModule } from '../audit/audit.module';

import { AdminAnalyticsController } from './analytics/admin-analytics.controller';
import { AdminTenantController } from './tenant/admin-tenant.controller';
import { AdminMdmController } from './mdm/admin-mdm.controller';
import { AdminSystemController } from './system/admin-system.controller';
import { AdminCorsController } from './cors/admin-cors.controller';
import { AdminCorsService } from './cors/admin-cors.service';

@Module({
  imports: [AuthModule, TenantModule, BillingModule, PlansModule, AuditModule],
  controllers: [
    AdminController,
    AdminWebhooksController,
    // PlatformController, // ❌ Removed to avoid conflict with PlatformModule

    AdminAnalyticsController,
    AdminTenantController,
    AdminMdmController,
    AdminSystemController,
    AdminCorsController,
  ],
  providers: [AdminCorsService],
  exports: [AdminCorsService],
})
export class AdminModule {}

