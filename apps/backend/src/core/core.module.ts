import { Module } from '@nestjs/common';

import { AuthModule } from './auth/auth.module';
import { TenantModule } from './tenant/tenant.module';
import { UsersModule } from './users/users.module';
import { MembersModule } from './members/members.module';
import { BillingModule } from './billing/billing.module';
import { AuditModule } from './audit/audit.module';
import { PrismaModule } from './prisma/prisma.module';
import { StaffModule } from './staff/staff.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    TenantModule,
    UsersModule,
    MembersModule,
    BillingModule,
    AuditModule,
    StaffModule,
    AdminModule,
  ],
  exports: [
    AuthModule,
    TenantModule,
    UsersModule,
    MembersModule,
    BillingModule,
    AuditModule,
    StaffModule,
  ],
})
export class CoreModule {}
