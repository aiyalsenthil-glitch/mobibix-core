import { Module } from '@nestjs/common';
import { StaffController } from './staff.controller';
import { AuthModule } from '../auth/auth.module';
import { StaffService } from './staff.service';
import { UsersModule } from '../users/users.module';
import { PrismaService } from '../prisma/prisma.service';
import { BillingModule } from '../billing/billing.module';
import { PermissionsModule } from '../permissions/permissions.module';

import { AuditModule } from '../audit/audit.module';
import { InviteCleanupCron } from './services/invite-cleanup.cron';

@Module({
  imports: [AuthModule, UsersModule, BillingModule, PermissionsModule, AuditModule], // ✅ REQUIRED for JwtAuthGuard, PlanFeatureGuard, and GranularPermissionGuard
  controllers: [StaffController],
  providers: [StaffService, PrismaService, InviteCleanupCron],
})
export class StaffModule {}
