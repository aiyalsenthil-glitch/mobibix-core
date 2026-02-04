import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  ForbiddenException,
  Logger,
  Inject,
  Req,
  Res,
} from '@nestjs/common';
import { Public } from '../../core/auth/decorators/public.decorator';
import { PrismaService } from '../../core/prisma/prisma.service';
import { WhatsAppCapabilityRouter } from './router/whatsapp-capability.router';


@Public()
@Controller('webhook/whatsapp')
export class WhatsAppWebhookController {
  private readonly logger = new Logger(WhatsAppWebhookController.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    private readonly router: WhatsAppCapabilityRouter,
  ) {}


  @Get()
  verifyWebhook(@Req() req, @Res() res) {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }

    return res.status(403).json({ message: 'Invalid verify token' });
  }

  /**
   * Handle incoming webhook events from Meta WhatsApp Cloud API
   * Events: message_status, delivery status, read status, etc.
   */
  @Post()
  @Public()
  handleWebhook(@Req() req, @Res() res) {
    console.log('🔥 WEBHOOK HIT');
    console.log('phone_number_id =', req.body?.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id);
    console.log('messages =', req.body?.entry?.[0]?.changes?.[0]?.value?.messages);
    res.sendStatus(200);
  }

     
       /**
        * Handle incoming messages (Text, Quick Reply, etc.)
        */
       private async handleIncomingMessages(messages: any[], metadata: any) {
         if (!messages || messages.length === 0) return;
     
         // Extract tenantId from metadata (if available) or we need another way?
         // WAIT: The webhook from Meta doesn't send "tenantId".
         // We must resolve tenantId from the `display_phone_number` or the `phone_number_id` in metadata.
         // metadata: { display_phone_number: '...', phone_number_id: '...' }
     
         const phoneNumberId = metadata?.phone_number_id;
         if (!phoneNumberId) {
           this.logger.warn('No phone_number_id in webhook metadata');
           return;
         }
     
         try {
           // Resolve Tenant by PhoneNumberId
           // We need a way to find Tenant ID from PhoneNumberId.
           // WhatsAppPhoneNumbersService has `findByPhoneNumberId`? Or direct Prisma query?
           // Since we can't inject Service easily without refactor circular deps maybe?
           // Let's rely on Prisma directly since it's already injected.
           
           const waNumber = await this.prisma.whatsAppPhoneNumber.findFirst({
             where: { phoneNumberId },
             select: { tenantId: true },
           });
     
           if (!waNumber) {
             this.logger.warn(`Unknown WhatsApp Number ID: ${phoneNumberId}`);
             return;
           }
     
           const tenantId = waNumber.tenantId;
     
           for (const message of messages) {
             const senderPhone = message.from; // e.g., 919876543210
             
             // Process only TEXT messages or QUICK REPLIES
             let text = '';
             if (message.type === 'text') {
               text = message.text?.body;
             } else if (message.type === 'interactive' && message.interactive?.type === 'button_reply') {
               // Handle button clicks (e.g. Menu options if we use buttons later)
               text = message.interactive.button_reply.id; // or title
             } else if (message.type === 'interactive' && message.interactive?.type === 'list_reply') {
                text = message.interactive.list_reply.id; 
             }
     
             if (text) {
               this.logger.log(`Received message from ${senderPhone} for Tenant ${tenantId}: "${text}"`);
               
               // ROUTE THE MESSAGE
               await this.router.routeMessage(tenantId, senderPhone, text);
             }
           }
      } catch (err) {
      this.logger.error('Error handling incoming messages', err);
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
