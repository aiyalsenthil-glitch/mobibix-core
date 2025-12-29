import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaService } from '../../core/prisma/prisma.service';
import { WhatsAppSender } from './whatsapp.sender';
import { WhatsAppCron } from './whatsapp.cron';
import { WhatsAppLogger } from './whatsapp.logger';
import { WhatsAppWebhookController } from './whatsapp.webhook.controller';

@Module({
  controllers: [WhatsAppWebhookController],
  imports: [ScheduleModule.forRoot()],
  providers: [PrismaService, WhatsAppSender, WhatsAppCron, WhatsAppLogger],
})
export class WhatsAppModule {}
