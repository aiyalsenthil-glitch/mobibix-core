import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { WhatsAppInboxGateway } from './whatsapp-inbox.gateway';
import { ConversationEngineService } from '../automation/conversation-engine.service';
import { PrismaService } from '../../../core/prisma/prisma.service';

@Injectable()
export class WhatsAppInboxService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WhatsAppInboxService.name);
  private subscriber: Redis;

  constructor(
    private configService: ConfigService,
    private inboxGateway: WhatsAppInboxGateway,
    private conversationEngine: ConversationEngineService,
    private prisma: PrismaService,
  ) {}
  onModuleInit() {
    const url = this.configService.get<string>('REDIS_URL');
    if (url) {
      this.subscriber = new Redis(url);
    } else {
      this.subscriber = new Redis({
        host: this.configService.get<string>('REDIS_HOST', 'localhost'),
        port: parseInt(this.configService.get<string>('REDIS_PORT', '6379')),
      });
    }
    
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
  }

  private async handleIncomingMessage(message: string) {
    try {
      const payload = JSON.parse(message);
      const { tenantId, senderPhone, body, jid, pushName, isHistory, syncStatus, progress } = payload;

      // Handle Sync Status instead of Message if present
      if (syncStatus) {
        this.inboxGateway.broadcastNewMessage(tenantId, { 
          syncStatus, 
          progress, 
          isSystem: true 
        });
        return;
      }

      const conversationId = jid || senderPhone || 'unknown';

      if (conversationId === 'status@broadcast') {
        this.logger.debug(`Skipping status update for tenant ${tenantId}`);
        return;
      }

      this.logger.log(`Incoming message for tenant ${tenantId} from ${conversationId} (${pushName || 'No Name'})`);

      // 1. Persist to DB
      const savedMsg = await (this.prisma as any).whatsAppMessageLog.create({
        data: {
          tenantId,
          phoneNumber: conversationId,
          direction: 'INCOMING',
          body: body || '',
          status: 'RECEIVED',
          provider: 'WEB_SOCKET',
          metadata: {
            jid,
            pushName,
          }
        }
      });

      // 2. Broadcast to frontend via WebSocket
      this.inboxGateway.broadcastNewMessage(tenantId, {
        ...payload,
        messageId: savedMsg.id,
        pushName: pushName, // Pass to frontend for display
      });

      // 3. Trigger Conversation Engine (Automation) - ONLY for live messages
      if (!isHistory) {
        await this.conversationEngine.processMessage(tenantId, conversationId, body);
      }
    } catch (err) {
      this.logger.error(`Error processing incoming message from Redis: ${err.message}`);
    }
  }
}
