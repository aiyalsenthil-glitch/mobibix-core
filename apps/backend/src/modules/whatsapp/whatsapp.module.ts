import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaService } from '../../core/prisma/prisma.service';
import { WhatsAppSender } from './whatsapp.sender';
import { WhatsAppCron } from './whatsapp.cron';
import { WhatsAppLogger } from './whatsapp.logger';
import { WhatsAppWebhookController } from './whatsapp.webhook.controller';
import { WhatsAppSettingsController } from './whatsapp-settings.controller';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppPhoneNumbersController } from './phone-numbers/whatsapp-phone-numbers.controller';
import { WhatsAppPhoneNumbersService } from './phone-numbers/whatsapp-phone-numbers.service';
import { WhatsAppVariableResolver } from './variable-resolver.service';

@Module({
  controllers: [
    WhatsAppWebhookController,
    WhatsAppSettingsController,
    WhatsAppController,
    WhatsAppPhoneNumbersController,
  ],
  imports: [ScheduleModule.forRoot()],
  providers: [
    PrismaService,
    WhatsAppSender,
    WhatsAppCron,
    WhatsAppLogger,
    WhatsAppPhoneNumbersService,
    WhatsAppVariableResolver,
  ],
  exports: [
    WhatsAppSender,
    WhatsAppPhoneNumbersService,
    WhatsAppVariableResolver,
  ],
})
export class WhatsAppModule {}
