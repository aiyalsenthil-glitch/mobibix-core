import { Module } from '@nestjs/common';
import { NotificationOrchestrator } from './notification.orchestrator';
import { NotificationEventBus } from './notification-event.bus';
import { EmailStrategy } from './strategies/email.strategy';
import { WhatsAppStrategy } from './strategies/whatsapp.strategy';
import { PrismaModule } from '../prisma/prisma.module';
import { WhatsAppModule } from '../../modules/whatsapp/whatsapp.module';

@Module({
  imports: [PrismaModule, WhatsAppModule],
  providers: [
    NotificationOrchestrator,
    NotificationEventBus,
    EmailStrategy,
    WhatsAppStrategy,
  ],
  exports: [NotificationOrchestrator],
})
export class NotificationsModule {}
