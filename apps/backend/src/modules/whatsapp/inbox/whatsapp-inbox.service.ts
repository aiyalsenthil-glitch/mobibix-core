import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { WhatsAppInboxGateway } from './whatsapp-inbox.gateway';
import { ConversationEngineService } from '../automation/conversation-engine.service';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { normalizeJid } from '../utils/jid.util';

@Injectable()
export class WhatsAppInboxService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WhatsAppInboxService.name);
  private subscriber: Redis;
  private publisher: Redis;

  constructor(
    private configService: ConfigService,
    private inboxGateway: WhatsAppInboxGateway,
    private conversationEngine: ConversationEngineService,
    private prisma: PrismaService,
  ) {}
  onModuleInit() {
    const url = this.configService.get<string>('REDIS_URL');
    const options = url ? url : {
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: parseInt(this.configService.get<string>('REDIS_PORT', '6379')),
      password: this.configService.get<string>('REDIS_PASSWORD') || undefined,
      tls: this.configService.get<string>('REDIS_TLS') === 'true' ? {} : undefined,
    };

    this.subscriber = new Redis(options as any);
    this.publisher = new Redis(options as any);

    this.subscriber.on('error', (err) => this.logger.warn(`Redis subscriber error: ${err.message}`));
    this.publisher.on('error', (err) => this.logger.warn(`Redis publisher error: ${err.message}`));

    this.subscriber.subscribe('whatsapp-incoming', (err) => {
      if (err) {
        this.logger.error(`Failed to subscribe to whatsapp-incoming: ${err.message}`);
      } else {
        this.logger.log('Subscribed to whatsapp-incoming channel');
      }
    });

    this.subscriber.on('message', (channel, message) => {
      if (channel === 'whatsapp-incoming') {
        this.logger.debug(`Received message from Redis: ${message.substring(0, 100)}...`);
        this.handleIncomingMessage(message);
      }
    });
  }

  onModuleDestroy() {
    this.subscriber.quit();
    this.publisher.quit();
  }

  async requestSync(tenantId: string, phoneNumber: string) {
    this.logger.log(`Requesting sync for tenant ${tenantId}, phone ${phoneNumber}`);
    await this.publisher.publish('whatsapp-sync-request', JSON.stringify({ tenantId, phoneNumber }));
  }

  private async handleIncomingMessage(message: string) {
    try {
      const payload = JSON.parse(message);
      console.log('--- [WHATSAPP_INBOX_VERSION_NEW] ---');
      const { 
        tenantId, 
        senderPhone, 
        body, 
        jid, 
        conversationId: payloadConvId, 
        pushName, 
        isHistory, 
        messageId, 
        syncStatus, 
        progress 
      } = payload;
      
      const conversationId = payloadConvId || jid || senderPhone || 'unknown';
      console.log(`[INBOX_RECV] tenant: ${tenantId}, conv: ${conversationId}, phone: ${senderPhone}, msgId: ${messageId}`);

      // Handle Sync Status instead of Message if present
      if (syncStatus) {
        this.inboxGateway.broadcastNewMessage(tenantId, { 
          syncStatus, 
          progress, 
          isSystem: true 
        });
        return;
      }

      const lowerConvId = conversationId.toLowerCase();
      // Drop statuses and broadcasts as they are meta-data, not conversations
      if (lowerConvId.includes('status') || lowerConvId.includes('broadcast')) {
        return;
      }

      this.logger.log(`Incoming message for tenant ${tenantId} from ${conversationId} (${pushName || 'No Name'})`);

      // 1. Persist to DB or Skip if exists
      const savedMsg = await (this.prisma as any).whatsAppMessageLog.upsert({
        where: { id: messageId || 'unknown' },
        update: {}, // No update needed if exists
        create: {
          id: messageId,
          tenantId,
          phoneNumber: senderPhone || null, // Optional phone
          jid: conversationId, // The full stable JID
          direction: 'INCOMING',
          body: body || '',
          status: 'RECEIVED',
          provider: 'WEB_SOCKET',
          metadata: {
            pushName,
          }
        }
      });

      // 2. Broadcast to frontend via WebSocket
      this.inboxGateway.broadcastNewMessage(tenantId, {
        ...payload,
        jid: conversationId,
        phoneNumber: senderPhone,
        messageId: savedMsg.id,
        pushName: pushName, 
      });

      // 3. Trigger Conversation Engine (Automation) - ONLY for live messages
      // Only trigger if we have a way to identify the user (phone or stable JID)
      if (!isHistory) {
        await this.conversationEngine.processMessage(tenantId, conversationId, body);
      }
    } catch (err) {
      this.logger.error(`Error processing incoming message from Redis: ${err.message}`);
    }
  }
}
