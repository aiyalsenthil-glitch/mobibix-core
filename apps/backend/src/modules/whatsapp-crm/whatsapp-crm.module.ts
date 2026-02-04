import { Module } from '@nestjs/common';
import { WhatsAppCrmController } from './whatsapp-crm.controller';
import { WhatsAppCrmService } from './whatsapp-crm.service';
import { WhatsAppCrmSubscriptionGuard } from './guards/whatsapp-crm-subscription.guard';
import { WhatsAppCrmEnabledGuard } from './guards/whatsapp-crm-enabled.guard';
import { WhatsAppCrmPhoneNumberGuard } from './guards/whatsapp-crm-phone-number.guard';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { BillingModule } from '../../core/billing/billing.module';
import { AuthModule } from '../../core/auth/auth.module';
import { TenantModule } from '../../core/tenant/tenant.module';

@Module({
  imports: [PrismaModule, BillingModule, AuthModule, TenantModule],
  controllers: [WhatsAppCrmController],
  providers: [
    WhatsAppCrmService,
    WhatsAppCrmSubscriptionGuard,
    WhatsAppCrmEnabledGuard,
    WhatsAppCrmPhoneNumberGuard,
  ],
  exports: [
    WhatsAppCrmService,
    WhatsAppCrmSubscriptionGuard,
    WhatsAppCrmEnabledGuard,
    WhatsAppCrmPhoneNumberGuard,
  ],
})
export class WhatsAppCrmModule {}
