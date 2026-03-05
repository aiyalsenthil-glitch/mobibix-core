import { Module } from '@nestjs/common';
import { NotificationOrchestrator } from './notification.orchestrator';
import { NotificationEventBus } from './notification-event.bus';
import { EmailStrategy } from './strategies/email.strategy';
import { WhatsAppStrategy } from './strategies/whatsapp.strategy';
import { InAppStrategy } from './strategies/in-app.strategy';
import { PrismaModule } from '../prisma/prisma.module';
import { WhatsAppModule } from '../../modules/whatsapp/whatsapp.module';
import { NotificationsController } from './notifications.controller';

@Module({
  imports: [PrismaModule, WhatsAppModule],
  controllers: [NotificationsController],
  providers: [
    NotificationOrchestrator,
    NotificationEventBus,
    EmailStrategy,
    WhatsAppStrategy,
    InAppStrategy,
  ],
  exports: [NotificationOrchestrator],
})
export class NotificationsModule {}
