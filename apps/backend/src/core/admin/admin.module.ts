import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { TenantModule } from '../tenant/tenant.module';
import { BillingModule } from '../billing/billing.module';
import { AuthModule } from '../auth/auth.module';
import { PlansModule } from '../billing/plans/plans.module';
import { AdminWebhooksController } from './admin-webhooks.controller';
import { PlatformController } from './platform.controller';
import { AuditModule } from '../audit/audit.module';

import { AdminAnalyticsController } from './analytics/admin-analytics.controller';
import { AdminTenantController } from './tenant/admin-tenant.controller';
import { AdminMdmController } from './mdm/admin-mdm.controller';
import { AdminSystemController } from './system/admin-system.controller';

@Module({
  imports: [AuthModule, TenantModule, BillingModule, PlansModule, AuditModule],
  controllers: [
    AdminController, 
    AdminWebhooksController, 
    PlatformController,
    AdminAnalyticsController,
    AdminTenantController,
    AdminMdmController,
    AdminSystemController
  ],
})
export class AdminModule {}
