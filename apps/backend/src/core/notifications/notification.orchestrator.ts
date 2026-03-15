import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { BaseNotificationPayload, ChannelStrategy } from './notification.types';
import { PrismaService } from '../prisma/prisma.service';
import { EmailStrategy } from './strategies/email.strategy';
import { WhatsAppStrategy } from './strategies/whatsapp.strategy';
import { InAppStrategy } from './strategies/in-app.strategy';

@Injectable()
export class NotificationOrchestrator implements OnModuleInit {
  private readonly logger = new Logger(NotificationOrchestrator.name);
  private strategies: Map<string, ChannelStrategy[]> = new Map();

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailStrategy: EmailStrategy,
    private readonly whatsappStrategy: WhatsAppStrategy,
    private readonly inAppStrategy: InAppStrategy,
  ) {}

  onModuleInit() {
    this.registerStrategy('tenant.deletion.requested', [this.emailStrategy, this.inAppStrategy]);
    this.registerStrategy('tenant.deletion.pending', [this.emailStrategy, this.inAppStrategy]);
    this.registerStrategy('tenant.deleted', [this.emailStrategy, this.inAppStrategy]);
    
    this.registerStrategy('subscription.active', [this.emailStrategy, this.whatsappStrategy, this.inAppStrategy]);
    this.registerStrategy('subscription.expired', [this.emailStrategy, this.whatsappStrategy, this.inAppStrategy]);
    this.registerStrategy('subscription.suspended', [this.emailStrategy, this.whatsappStrategy, this.inAppStrategy]);
    
    // NEW: Welcome notifications with In-App support
    this.registerStrategy('tenant.welcome', [this.emailStrategy, this.inAppStrategy]);

    // NEW: Admin broadcast notifications
    this.registerStrategy('admin.broadcast', [this.inAppStrategy]);

    // STAFF FLOW
    this.registerStrategy('staff.invite.rejected', [this.emailStrategy, this.inAppStrategy]);
  }

  registerStrategy(eventId: string, strategies: ChannelStrategy[]) {
    this.strategies.set(eventId, strategies);
  }

  async dispatch(payload: BaseNotificationPayload) {
    this.logger.log(`[Orchestrator] Received event: ${payload.eventId} for Tenant: ${payload.tenantId}`);

    const strategiesToUse = this.strategies.get(payload.eventId);

    if (!strategiesToUse || strategiesToUse.length === 0) {
      this.logger.warn(`No notification strategy registered for event: ${payload.eventId}`);
      return;
    }

    // Attempt delivery via all registered strategies for this event
    for (const strategy of strategiesToUse) {
      const channel = strategy.getChannel();
      
      this.logger.log(`Evaluating Channel: ${channel} for Event: ${payload.eventId}`);
      
      let recipientString: string | undefined = payload.recipient;

      // Skip contact lookup for IN_APP channel - it uses userId/tenantId as the box identifier
      if (channel === 'IN_APP') {
        recipientString = payload.userId || payload.tenantId; // Internal recipient
      } else {
        // Handle Tenant ID as recipient (Find owner)
        if (recipientString === payload.tenantId) {
          const tenant = await this.prisma.tenant.findUnique({
            where: { id: payload.tenantId },
            include: { userTenants: { where: { role: 'OWNER' }, include: { user: true } } }
          });
          const owner = tenant?.userTenants[0]?.user;
          if (owner) {
            if (channel === 'EMAIL' && owner.email) recipientString = owner.email;
            if (channel === 'WHATSAPP' && owner.phone) recipientString = owner.phone;
          }
        }

        // In real world usage: fetch recipient details if only userId is provided
        if (payload.userId && recipientString === payload.userId) {
          const user = await this.prisma.user.findUnique({
            where: { id: payload.userId },
          });

          if (user) {
            if (channel === 'EMAIL' && user.email) {
              recipientString = user.email;
            } else if (channel === 'WHATSAPP' && user.phone) {
              recipientString = user.phone;
            }
          }
        }

        // Check if recipient contact info is available for this channel
        if (!recipientString || recipientString === payload.userId || recipientString === payload.tenantId) {
          this.logger.warn(`Missing contact information for channel ${channel} on event ${payload.eventId}`);
          continue; // skip this channel
        }
      }

      // Note: model casing in Prisma client is camelCase (notificationLog)
      const logRecord = await this.prisma.notificationLog.create({
        data: {
          tenantId: payload.tenantId,
          userId: payload.userId,
          eventId: payload.eventId,
          channel: channel,
          recipient: recipientString,
          status: 'PENDING',
          payload: payload.data as any,
        },
      });

      try {
        const payloadToDispatch = { ...payload, recipient: recipientString };
        const success = await strategy.send(payloadToDispatch);

        if (success) {
          await this.prisma.notificationLog.update({
            where: { id: logRecord.id },
            data: { status: 'SENT', sentAt: new Date() },
          });
          this.logger.log(`Channel ${channel} Sent successfully.`);
        } else {
           await this.prisma.notificationLog.update({
             where: { id: logRecord.id },
             data: { status: 'FAILED', errorReason: 'Provider returned false' },
           });
        }
      } catch (err: any) {
        this.logger.error(`Error sending via ${channel}: ${err.message}`);
        await this.prisma.notificationLog.update({
          where: { id: logRecord.id },
          data: { status: 'FAILED', errorReason: err.message },
        });
      }
    }
  }
}
