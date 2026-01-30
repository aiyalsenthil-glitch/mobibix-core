import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  ForbiddenException,
  Logger,
  Inject,
} from '@nestjs/common';
import { Public } from '../../core/auth/decorators/public.decorator';
import { PrismaService } from '../../core/prisma/prisma.service';

@Public()
@Controller('webhook/whatsapp')
export class WhatsAppWebhookController {
  private readonly logger = new Logger(WhatsAppWebhookController.name);

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Get()
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ) {
    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      return challenge;
    }

    throw new ForbiddenException('Invalid verify token');
  }

  /**
   * Handle incoming webhook events from Meta WhatsApp Cloud API
   * Events: message_status, delivery status, read status, etc.
   */
  @Post()
  @Public()
  async handleWebhook(@Body() body: any) {
    try {
      // Meta webhook structure
      const changes = body?.entry?.[0]?.changes?.[0];
      if (!changes) {
        return { received: true };
      }

      const metadata = changes.value?.metadata;
      const statuses = changes.value?.statuses || [];
      const messages = changes.value?.messages || [];

      // Process status updates (message_status webhooks)
      for (const status of statuses) {
        await this.handleStatusUpdate(status, metadata);
      }

      // Process incoming messages (optional, not needed for status tracking)
      for (const message of messages) {
        this.logger.debug(
          `Incoming message from ${message.from}: ${message.id}`,
        );
      }

      return { received: true };
    } catch (error) {
      this.logger.error('Webhook processing error', error);
      return { received: true }; // Return success to Meta regardless
    }
  }

  /**
   * Handle message status updates from Meta
   * Updates WhatsAppLog with delivery status
   */
  private async handleStatusUpdate(status: any, metadata: any) {
    const messageId = status.id;
    const statusValue = status.status; // sent, delivered, read, failed
    const timestamp = status.timestamp
      ? new Date(parseInt(status.timestamp) * 1000)
      : new Date();
    const recipientId = status.recipient_id;

    if (!messageId) {
      return;
    }

    try {
      // Find the log entry by messageId
      const log = await this.prisma.whatsAppLog.findFirst({
        where: { messageId },
      });

      if (!log) {
        this.logger.warn(
          `No log found for messageId: ${messageId}. Status: ${statusValue}`,
        );
        return;
      }

      // Update log status based on Meta status
      const updateData: any = {
        updatedAt: timestamp,
      };

      switch (statusValue) {
        case 'sent':
          updateData.status = 'SENT';
          break;
        case 'delivered':
          updateData.status = 'DELIVERED';
          updateData.deliveredAt = timestamp;
          break;
        case 'read':
          updateData.status = 'READ';
          updateData.readAt = timestamp;
          break;
        case 'failed':
          updateData.status = 'FAILED';
          updateData.error = status.errors
            ? JSON.stringify(status.errors)
            : 'Failed to deliver';
          break;
        default:
          break;
      }

      await this.prisma.whatsAppLog.update({
        where: { id: log.id },
        data: updateData,
      });

      this.logger.log(`Updated message ${messageId} status to ${statusValue}`);
    } catch (error) {
      this.logger.error(
        `Failed to update status for messageId ${messageId}:`,
        error,
      );
    }
  }
}
