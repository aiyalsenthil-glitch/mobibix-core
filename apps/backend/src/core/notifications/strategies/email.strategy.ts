import { Injectable, Logger } from '@nestjs/common';
import { ChannelStrategy, BaseNotificationPayload, NotificationChannel } from '../notification.types';
import { EmailService } from '../../../common/email/email.service';

@Injectable()
export class EmailStrategy implements ChannelStrategy {
  private readonly logger = new Logger(EmailStrategy.name);

  constructor(private readonly emailService: EmailService) {}

  getChannel(): NotificationChannel {
    return 'EMAIL';
  }

  async send(payload: BaseNotificationPayload): Promise<boolean> {
    try {
      this.logger.debug(`Sending Email notification for event ${payload.eventId} to ${payload.recipient}`);

      // We map the Notification payload directly to our internal EmailService
      // which uses React templates under the hood.

      // Map dynamic Subject based on eventId (or provided in data)
      let subject = payload.data.subject || `Notification from ${payload.moduleType}`;

      // Convert eventId standard to emailType enum standard
      // "tenant.deletion.requested" -> "DELETION_REQUEST"
      // "tenant.welcome" -> "TENANT_WELCOME"
      let emailType = payload.eventId.replace(/\./g, '_').toUpperCase();
      if (payload.eventId === 'tenant.deletion.requested') emailType = 'DELETION_REQUEST';
      if (payload.eventId === 'tenant.deletion.pending') emailType = 'DELETION_REMINDER';

      await this.emailService.send({
        tenantId: payload.tenantId,
        recipientType: payload.data.recipientType || 'TENANT', // defaults to TENANT owner
        emailType: emailType as any,
        referenceId: payload.data.referenceId || "SYSTEM",
        module: payload.moduleType,
        to: payload.recipient,
        subject: subject,
        data: payload.data,
      });

      return true;
    } catch (err) {
      this.logger.error(`Failed to send Email notification: ${err.message}`);
      return false; // Tells Orchestrator that it failed, to retry later
    }
  }
}
