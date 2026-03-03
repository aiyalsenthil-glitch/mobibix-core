import { Module } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { TenantController } from './tenant.controller';
import { TenantDeletionCron } from './tenant-deletion.cron';
import { TenantUsageController } from './tenant-usage.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { BillingModule } from '../billing/billing.module';
import { PlansModule } from '../billing/plans/plans.module';
import { UsageSnapshotService } from '../analytics/usage-snapshot.service';
import { PartnersModule } from '../../modules/partners/partners.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    BillingModule,
    PlansModule,
    PartnersModule,
  ],
  controllers: [TenantController, TenantUsageController],
  providers: [TenantService, UsageSnapshotService, TenantDeletionCron],
  exports: [TenantService, UsageSnapshotService], // 👈 THIS IS THE KEY LINE
})
export class TenantModule {}
