import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaService } from '../../core/prisma/prisma.service';
import { WhatsAppSender } from './whatsapp.sender';
import { WhatsAppCron } from './whatsapp.cron';
import { SafeWhatsAppCron } from './safe-whatsapp.cron';
import { WhatsAppLogger } from './whatsapp.logger';
import { WhatsAppWebhookController } from './whatsapp.webhook.controller';
import { WhatsAppSettingsController } from './whatsapp-settings.controller';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppPhoneNumbersController } from './phone-numbers/whatsapp-phone-numbers.controller';
import { WhatsAppPhoneNumbersService } from './phone-numbers/whatsapp-phone-numbers.service';
import { WhatsAppVariableResolver } from './variable-resolver.service';
import { BillingModule } from '../../core/billing/billing.module';
import { AutomationController } from './automation.controller';
import { AutomationService } from './automation.service';
import { AutomationSafetyService } from './automation-safety.service';
import { EntityResolverService } from './entity-resolver.service';

@Module({
  controllers: [
    WhatsAppWebhookController,
    WhatsAppSettingsController,
    WhatsAppController,
    WhatsAppPhoneNumbersController,
    AutomationController,
  ],
  imports: [ScheduleModule.forRoot(), BillingModule],
  providers: [
    PrismaService,
    WhatsAppSender,
    WhatsAppCron,
    SafeWhatsAppCron,
    WhatsAppLogger,
    WhatsAppPhoneNumbersService,
    WhatsAppVariableResolver,
    AutomationService,
    AutomationSafetyService,
    EntityResolverService,
  ],
  exports: [
    WhatsAppSender,
    WhatsAppPhoneNumbersService,
    WhatsAppVariableResolver,
    AutomationService,
  ],
})
export class WhatsAppModule {}
