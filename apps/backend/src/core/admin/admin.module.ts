import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { TenantModule } from '../tenant/tenant.module';
import { BillingModule } from '../billing/billing.module';
import { AuthModule } from '../auth/auth.module';
import { PlansModule } from '../billing/plans/plans.module';
import { AdminWebhooksController } from './admin-webhooks.controller';
// import { PlatformController } from './platform.controller';
import { AuditModule } from '../audit/audit.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PartnersModule } from '../../modules/partners/partners.module';
import { NotificationsModule } from '../notifications/notifications.module';

import { AdminAnalyticsController } from './analytics/admin-analytics.controller';
import { AdminTenantController } from './tenant/admin-tenant.controller';
import { AdminMdmController } from './mdm/admin-mdm.controller';
import { AdminSystemController } from './system/admin-system.controller';
import { AdminUserController } from './system/admin-user.controller';
import { AdminPartnerController } from './partners/admin-partner.controller';
import { AdminAiController } from './analytics/admin-ai.controller';
import { AdminCorsController } from './cors/admin-cors.controller';
import { AdminCorsService } from './cors/admin-cors.service';
import { BullModule } from '@nestjs/bullmq';
import { AdminCacheService } from './cache/admin-cache.service';
import { AdminJobsCronService } from './jobs/admin-jobs.cron';
import { RefreshKpiCacheJob } from './jobs/refresh-kpi-cache.job';
import { DashboardController } from './dashboard/dashboard.controller';
import { MobibixAdminController } from './products/mobibix/mobibix-admin.controller';
import { GympilotAdminController } from './products/mobibix/mobibix-admin.controller';
import { RevenueAdminController } from './revenue/revenue-admin.controller';
import { InvestorController } from './investor/investor.controller';
import { FinancialsAdminController } from './financials/financials-admin.controller';
import { FinancialsAdminService } from './financials/financials-admin.service';
import { MetricsAggregatorService } from './jobs/metrics-aggregator.service';
import { TenantIntelligenceController } from './tenant-intelligence/tenant-intelligence.controller';
import { TenantIntelligenceService } from './tenant-intelligence/tenant-intelligence.service';

@Module({
  imports: [
    AuthModule,
    TenantModule,
    BillingModule,
    PlansModule,
    AuditModule,
    PrismaModule,
    PartnersModule,
    NotificationsModule,
    BullModule.registerQueue({
      name: 'admin-jobs',
    }),
  ],
  controllers: [
    AdminController,
    AdminWebhooksController,
    // PlatformController, // ❌ Removed to avoid conflict with PlatformModule

    AdminAnalyticsController,
    AdminTenantController,
    AdminMdmController,
    AdminSystemController,
    AdminUserController,
    AdminPartnerController,
    AdminAiController,
    AdminCorsController,
    DashboardController,
    MobibixAdminController,
    GympilotAdminController,
    RevenueAdminController,
    InvestorController,
    FinancialsAdminController,
    TenantIntelligenceController,
  ],
  providers: [
    AdminCorsService,
    AdminCacheService,
    AdminJobsCronService,
    RefreshKpiCacheJob,
    FinancialsAdminService,
    MetricsAggregatorService,
    TenantIntelligenceService,
  ],
  exports: [AdminCorsService, AdminCacheService],
})
export class AdminModule {}
