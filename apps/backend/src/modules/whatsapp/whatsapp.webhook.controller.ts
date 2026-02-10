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
  async handleWebhook(@Req() req, @Res() res) {
    // 1. Validations (Signature)
    const signature = req.headers['x-hub-signature-256'];
    if (!signature) {
      this.logger.warn('Missing signature');
      return res.status(403).json({ message: 'Missing signature' });
    }

    const appSecret = process.env.WHATSAPP_APP_SECRET; // Ensure this env is set
    if (appSecret) {
      // Basic HMAC verification if secret exists
      const crypto = require('crypto');
      const hmac = crypto.createHmac('sha256', appSecret);
      const digest = Buffer.from(
        'sha256=' +
          hmac.update(req.rawBody || JSON.stringify(req.body)).digest('hex'),
        'utf8',
      );
      const checksum = Buffer.from(signature, 'utf8');

      if (
        digest.length !== checksum.length ||
        !crypto.timingSafeEqual(digest, checksum)
      ) {
        this.logger.warn('Invalid signature');
        return res.status(403).json({ message: 'Invalid signature' });
      }
    }

    // 2. Fast ACK
    res.status(200).send('EVENT_RECEIVED');

    // 3. Async Processing
    try {
      const body = req.body;
      const changes = body?.entry?.[0]?.changes?.[0];
      if (!changes) return; // Handshake or heartbeat

      const metadata = changes.value?.metadata;
      const messages = changes.value?.messages || [];
      const statuses = changes.value?.statuses || [];

      console.log(
        `[Webhook] Processing ${messages.length} messages, ${statuses.length} statuses.`,
      );

      // A. Process Statuses (Async)
      for (const status of statuses) {
        // Void promise to avoid unhandled rejection crash at top level
        this.handleStatusUpdate(status, metadata).catch((err) =>
          this.logger.error(`Status update error: ${err.message}`),
        );
      }

      // B. Process Messages (Async)
      if (messages.length > 0) {
        console.log('[Webhook] Invoking handleIncomingMessages...');
        this.handleIncomingMessages(messages, metadata).catch((err) =>
          this.logger.error(`Message processing error: ${err.message}`),
        );
      }
    } catch (error) {
      this.logger.error(
        `Webhook processing crashed: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Handle incoming messages (Text, Quick Reply, etc.)
   */
  private async handleIncomingMessages(messages: any[], metadata: any) {
    console.log('[Webhook] handleIncomingMessages started');

    if (!messages || messages.length === 0) return;

    const phoneNumberId = metadata?.phone_number_id;
    console.log(`[Webhook] PhoneNumberId from metadata: ${phoneNumberId}`);

    if (!phoneNumberId) {
      this.logger.warn('No phone_number_id in webhook metadata');
      return;
    }

    try {
      // 1. Resolve Tenant from per-tenant phone numbers
      const waNumber = await this.prisma.whatsAppPhoneNumber.findFirst({
        where: { phoneNumberId },
        select: { tenantId: true },
      });

      console.log(
        `[Webhook] Tenant lookup result: ${JSON.stringify(waNumber)}`,
      );

      // ── OUTBOUND-ONLY POLICY ──────────────────────────────────
      // If phoneNumberId is NOT found in per-tenant numbers, check
      // if it's a module-level (shared) number. Module-level numbers
      // are OUTBOUND-ONLY: do NOT process inbound messages to avoid
      // routing ambiguity (many tenants share this number).
      if (!waNumber) {
        const modulePhone =
          await this.prisma.whatsAppPhoneNumberModule.findFirst({
            where: { phoneNumberId, isActive: true },
            select: { id: true },
          });

        if (modulePhone) {
          this.logger.log(
            `[OUTBOUND-ONLY] Dropping inbound message on module-level number ${phoneNumberId}. Policy: shared numbers are outbound-only.`,
          );
          return; // Silently drop — this is by design
        }

        this.logger.warn(`Unknown WhatsApp Number ID: ${phoneNumberId}`);
        return;
      }

      const tenantId = waNumber.tenantId;

      for (const message of messages) {
        const messageId = message.id; // wamid.HBgLM...
        console.log(`[Webhook] Processing messageId: ${messageId}`);

        // 2. Idempotency Check
        const existingLog = await this.prisma.whatsAppLog.findFirst({
          where: { messageId },
          select: { id: true },
        });

        if (existingLog) {
          this.logger.debug(`Duplicate message ignored: ${messageId}`);
          console.log(`[Webhook] Duplicate ignored: ${messageId}`);
          continue;
        }

        // 3. Process Content
        const senderPhone = message.from;
        let text = '';

        if (message.type === 'text') {
          text = message.text?.body;
        } else if (message.type === 'interactive') {
          const interactive = message.interactive;
          if (interactive.type === 'button_reply') {
            text = interactive.button_reply.id;
          } else if (interactive.type === 'list_reply') {
            text = interactive.list_reply.id;
          }
        }

        console.log(`[Webhook] Extracted text: "${text}" from ${senderPhone}`);

        if (text) {
          this.logger.log(
            `📨 Received '${text}' from ${senderPhone} (Tenant: ${tenantId})`,
          );

          // 4. Log Incoming Message (Optional but good for history)
          // We create a log entry so next time it's caught by idempotency
          await this.prisma.whatsAppLog.create({
            data: {
              tenantId,
              phone: senderPhone,
              type: 'INCOMING',
              status: 'RECEIVED',
              messageId: messageId,
              metadata: message,
            },
          });

          // 5. Route to Automation
          console.log(
            `[Webhook] Routing to automation for Tenant ${tenantId}...`,
          );
          await this.router.routeMessage(tenantId, senderPhone, text);
        } else {
          console.log('[Webhook] No text content found in message.');
        }
      }
    } catch (err) {
      this.logger.error(
        `Error handling incoming messages: ${err.message}`,
        err.stack,
      );
    }
  }

  /**
   * Handle message status updates from Meta
   */
  private async handleStatusUpdate(status: any, metadata: any) {
    const messageId = status.id;
    const statusValue = status.status;
    const timestamp = status.timestamp
      ? new Date(parseInt(status.timestamp) * 1000)
      : new Date();

    if (!messageId) return;

    try {
      // Find the log entry by messageId
      const log = await this.prisma.whatsAppLog.findFirst({
        where: { messageId },
        select: { id: true }, // optim
      });

      if (!log) {
        // Warning is okay, sometimes status arrives before log created if async race
        // this.logger.warn(`No log found for status update: ${messageId}`);
        return;
      }

      const updateData: any = { updatedAt: timestamp };

      if (statusValue === 'sent') updateData.status = 'SENT';
      else if (statusValue === 'delivered') {
        updateData.status = 'DELIVERED';
        updateData.deliveredAt = timestamp;
      } else if (statusValue === 'read') {
        updateData.status = 'READ';
        updateData.readAt = timestamp;
      } else if (statusValue === 'failed') {
        updateData.status = 'FAILED';
        updateData.error = status.errors
          ? JSON.stringify(status.errors)
          : 'Failed';
      }

      await this.prisma.whatsAppLog.update({
        where: { id: log.id },
        data: updateData,
      });
      // this.logger.debug(`Updated status ${messageId} -> ${statusValue}`);
    } catch (error) {
      this.logger.error(
        `Failed to update status ${messageId}: ${error.message}`,
      );
    }
  }
}
