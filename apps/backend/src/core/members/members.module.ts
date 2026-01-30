import { Module } from '@nestjs/common';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { SubscriptionsModule } from '../billing/subscriptions/subscriptions.module';
import { AuditModule } from '../audit/audit.module';
import { WhatsAppModule } from '../../modules/whatsapp/whatsapp.module';
import { TenantModule } from '../tenant/tenant.module';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    SubscriptionsModule,
    AuditModule,
    WhatsAppModule, // ✅ ADD THIS
    TenantModule,
    BillingModule,
  ],
  controllers: [MembersController],
  providers: [MembersService],
  exports: [MembersService],
})
export class MembersModule {}
