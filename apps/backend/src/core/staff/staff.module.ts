import { Module } from '@nestjs/common';
import { StaffController } from './staff.controller';
import { AuthModule } from '../auth/auth.module';
import { StaffService } from './staff.service';
import { UsersModule } from '../users/users.module';
import { PrismaService } from '../prisma/prisma.service';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [AuthModule, UsersModule, BillingModule], // ✅ REQUIRED for JwtAuthGuard & PlanFeatureGuard
  controllers: [StaffController],
  providers: [StaffService, PrismaService],
})
export class StaffModule {}
