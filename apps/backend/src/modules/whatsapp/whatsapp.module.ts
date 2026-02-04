import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaService } from '../../core/prisma/prisma.service';
import { WhatsAppSender } from './whatsapp.sender';
import { WhatsAppCron } from './whatsapp.cron';
import { SafeWhatsAppCron } from './safe-whatsapp.cron';
import { WhatsAppRemindersCron } from './whatsapp-reminders.cron'; // ✅ Added
import { WhatsAppRemindersService } from './whatsapp-reminders.service'; // ✅ Added
import { WhatsAppLogger } from './whatsapp.logger';
import { WhatsAppWebhookController } from './whatsapp.webhook.controller';
import { WhatsAppSettingsController } from './whatsapp-settings.controller';
import { WhatsAppTenantsController } from './whatsapp-tenants.controller';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppDebugController } from './whatsapp-debug.controller';
import { WhatsAppPlansController } from './whatsapp-plans.controller';
import { WhatsAppPhoneNumbersController } from './phone-numbers/whatsapp-phone-numbers.controller';
import { WhatsAppPhoneNumbersService } from './phone-numbers/whatsapp-phone-numbers.service';
import { WhatsAppVariableResolver } from './variable-resolver.service';
import { BillingModule } from '../../core/billing/billing.module';
import { AutomationController } from './automation.controller';
import { AutomationService } from './automation.service';
import { AutomationSafetyService } from './automation-safety.service';
import { EntityResolverService } from './entity-resolver.service';
import { WhatsAppUserController } from './whatsapp-user.controller';
import { WhatsAppUserService } from './whatsapp-user.service';
import { WhatsAppCrmController } from './whatsapp-crm.controller';

@Module({
  controllers: [
    WhatsAppWebhookController,
    WhatsAppSettingsController,
    WhatsAppController,
    WhatsAppPhoneNumbersController,
    AutomationController,
    WhatsAppWebhookController,
    WhatsAppSettingsController,
    WhatsAppController,
    WhatsAppPhoneNumbersController,
    AutomationController,
    WhatsAppTenantsController,
    WhatsAppDebugController, // ✅ Added
    WhatsAppPlansController, // <-- Added for /whatsapp/plans
    WhatsAppUserController,
    WhatsAppCrmController,
  ],
  imports: [ScheduleModule.forRoot(), BillingModule],
  providers: [
    PrismaService,
    WhatsAppSender,
    WhatsAppCron,
    SafeWhatsAppCron,
    WhatsAppLogger,
    WhatsAppPhoneNumbersService,
    WhatsAppVariableResolver, // ✅ Restored
    AutomationService, // ✅ Restored
    AutomationSafetyService,
    EntityResolverService,
    WhatsAppRemindersService, // ✅ Added for DI
    WhatsAppRemindersCron, // ✅ Added for reminder sending
    WhatsAppUserService,
  ],
  exports: [
    WhatsAppSender,
    WhatsAppPhoneNumbersService,
    WhatsAppVariableResolver,
    AutomationService,
  ],
})
export class WhatsAppModule {}
