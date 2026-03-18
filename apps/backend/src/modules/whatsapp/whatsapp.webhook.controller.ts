import {
  Controller,
  Get,
  Post,
  Logger,
  Inject,
  Req,
  Res,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../core/auth/decorators/public.decorator';
import { SkipSubscriptionCheck } from '../../core/auth/decorators/skip-subscription-check.decorator';
import { PrismaService } from '../../core/prisma/prisma.service';
import { WhatsAppCapabilityRouter } from './router/whatsapp-capability.router';
import { WhatsAppInboxGateway } from './inbox/whatsapp-inbox.gateway';

@Public()
@SkipSubscriptionCheck()
@Throttle({ default: { limit: 100, ttl: 60000 } }) // SECURITY: 100 webhook events per minute
@Controller('webhook/whatsapp')
export class WhatsAppWebhookController {
  private readonly logger = new Logger(WhatsAppWebhookController.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    private readonly router: WhatsAppCapabilityRouter,
    private readonly inboxGateway: WhatsAppInboxGateway,
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
    // 1. Validations (Signature) - CRITICAL: Reject unsigned webhooks
    const signature = req.headers['x-hub-signature-256'];
    if (!signature) {
      this.logger.error(
        'SECURITY: Webhook received without X-Hub-Signature-256',
      );
      return res.status(403).json({ message: 'Missing signature' });
    }

    // ✅ SECURITY FIX: WHATSAPP_APP_SECRET is now REQUIRED
    const appSecret = process.env.WHATSAPP_APP_SECRET;
    if (!appSecret) {
      this.logger.error(
        'CRITICAL: WHATSAPP_APP_SECRET not configured! Webhook validation disabled.',
      );
      return res
        .status(500)
        .json({ message: 'Webhook validation misconfigured' });
    }

    // HMAC signature verification
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', appSecret);

    // 🚨 SECURITY FIX: Prefer req.rawBody if available (requires configuration in main.ts)
    // Fallback to JSON.stringify(req.body) if rawBody is missing
    const bodyPayload = req.rawBody || Buffer.from(JSON.stringify(req.body));
    const digest = Buffer.from(
      'sha256=' + hmac.update(bodyPayload).digest('hex'),
      'utf8',
    );
    const checksum = Buffer.from(signature, 'utf8');

    if (
      digest.length !== checksum.length ||
      !crypto.timingSafeEqual(digest, checksum)
    ) {
      this.logger.warn('Invalid signature - payload mismatch');
      return res.status(403).json({ message: 'Invalid signature' });
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


      // A. Process Statuses (Async)
      for (const status of statuses) {
        // Void promise to avoid unhandled rejection crash at top level
        this.handleStatusUpdate(status, metadata).catch((err) =>
          this.logger.error(`Status update error: ${err.message}`),
        );
      }

      // B. Process Messages (Async)
      if (messages.length > 0) {
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

    if (!messages || messages.length === 0) return;

    const phoneNumberId = metadata?.phone_number_id;

    if (!phoneNumberId) {
      this.logger.warn('No phone_number_id in webhook metadata');
      return;
    }

    try {
      // 1. Resolve Number from unified WhatsAppNumber table
      const waNumber = await this.prisma.whatsAppNumber.findUnique({
        where: { phoneNumberId },
        select: {
          id: true,
          tenantId: true,
          moduleType: true,
          isSystem: true,
        },
      });


      if (!waNumber) {
        this.logger.warn(`Unknown WhatsApp Number ID: ${phoneNumberId}`);
        return;
      }

      // ── OUTBOUND-ONLY POLICY ──────────────────────────────────────────────
      // ⚠️ CRITICAL: Shared numbers (where tenantId is NULL) are OUTBOUND-ONLY.
      // We do NOT process inbound messages for them to avoid routing ambiguity.
      //
      // Rationale:
      // - Shared numbers are owned by the PLATFORM, not individual tenants
      // - Multiple tenants could theoretically receive inbound → NO CLEAR ROUTING TARGET
      // - Solution: Each tenant must configure their OWN tenant-scoped phone numbers
      // - Shared numbers suitable ONLY for outbound (notifications, broadcasts, announcements)
      //
      // Customer Guidance:
      // - INBOUND flows (auto-reply, customer service): Use tenant-specific numbers
      // - OUTBOUND only: Use shared/platform numbers for blast campaigns
      // - HYBRID: Mix tenant-specific (inbound) + shared (outbound) for optimal coverage
      //
      // Documentation: https://docs.yourcompany.com/whatsapp-setup
      // ──────────────────────────────────────────────────────────────────────
      if (!waNumber.tenantId) {
        this.logger.warn(
          `[OUTBOUND-ONLY POLICY] Inbound message dropped on shared number +${metadata?.display_phone_number || phoneNumberId} ` +
            `(Module: ${waNumber.moduleType}, MessageID: ${messages[0]?.id}). ` +
            `If you need inbound support for this module, configure a tenant-scoped phone number. ` +
            `See: https://docs.yourcompany.com/whatsapp-setup`,
        );
        return; // Silently drop — this is by design and expected behavior
      }

      const tenantId = waNumber.tenantId;

      if (!tenantId) {
        this.logger.warn(
          `[Webhook] Message on number ${waNumber.id} has no Tenant ID mapping.`,
        );
        return;
      }

      for (const message of messages) {
        const messageId = message.id; // wamid.HBgLM...
        this.logger.debug(`[Webhook] Processing messageId: ${messageId}`);

        // 2. Idempotency Check
        const existingLog = await this.prisma.whatsAppLog.findFirst({
          where: { messageId },
          select: { id: true },
        });

        if (existingLog) {
          this.logger.debug(`Duplicate message ignored: ${messageId}`);
          this.logger.debug(`[Webhook] Duplicate ignored: ${messageId}`);
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

        // REMOVED: console.log message text for security
        this.logger.debug(`[Webhook] Extracted text from ${senderPhone}`);

        // Extract text for all message types
        const bodyText = text || message.type || '[media]';

        this.logger.log(`📨 Received ${message.type} from ${senderPhone} (Tenant: ${tenantId})`);

        // 4. Log to WhatsAppLog (idempotency / status tracking)
        await this.prisma.whatsAppLog.create({
          data: {
            tenantId,
            whatsAppNumberId: waNumber.id,
            phone: senderPhone,
            type: 'INCOMING',
            status: 'RECEIVED',
            messageId,
            metadata: message,
          },
        });

        // 5. Write to WhatsAppMessageLog (inbox conversations view)
        await (this.prisma as any).whatsAppMessageLog.create({
          data: {
            tenantId,
            phoneNumber: senderPhone,
            direction: 'INCOMING',
            body: bodyText,
            status: 'RECEIVED',
            provider: 'META_CLOUD',
            whatsAppNumberId: waNumber.id,
            metadata: message,
          },
        });

        // 6. Broadcast to WebSocket (real-time inbox update)
        this.inboxGateway.broadcastNewMessage(tenantId, {
          messageId,
          senderPhone,
          body: bodyText,
          direction: 'INCOMING',
          timestamp: new Date().toISOString(),
        });

        // 7. Route to Automation (text only)
        if (text) {
          await this.router.routeMessage(tenantId, waNumber.id, senderPhone, text);
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
