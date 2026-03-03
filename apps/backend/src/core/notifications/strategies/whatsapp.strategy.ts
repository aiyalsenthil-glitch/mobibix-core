import { Injectable, Logger } from '@nestjs/common';
import { ChannelStrategy, BaseNotificationPayload, NotificationChannel } from '../notification.types';
import { AutomationService } from '../../../modules/whatsapp/automation.service';

@Injectable()
export class WhatsAppStrategy implements ChannelStrategy {
  private readonly logger = new Logger(WhatsAppStrategy.name);

  constructor(private readonly automationService: AutomationService) {}

  getChannel(): NotificationChannel {
    return 'WHATSAPP';
  }

  async send(payload: BaseNotificationPayload): Promise<boolean> {
    try {
      this.logger.debug(`Sending WhatsApp notification for event ${payload.eventId} to ${payload.recipient}`);

      // We use the existing AutomationService to handle the WhatsApp sending logic,
      // mapping our new BaseNotificationPayload into what the AutomationService expects.
      
      // Note: In a fully refactored system, the AutomationService might be merged here.
      // But for now, we wrap it to ensure backward compatibility and limit checks.
      await this.automationService.handleEvent({
        moduleType: payload.moduleType,
        eventType: payload.eventId.replace(/\./g, '_').toUpperCase(), // e.g. "invoice.overdue" -> "INVOICE_OVERDUE"
        tenantId: payload.tenantId,
        customerId: payload.userId, // Can be used as customerId if applicable
        entityId: payload.data.referenceId || "SYSTEM",
        payload: payload.data,
      });

      return true;
    } catch (err) {
      this.logger.error(`Failed to send WhatsApp notification: ${err.message}`);
      return false;
    }
  }
}
