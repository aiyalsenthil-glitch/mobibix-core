import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { RetailDemoHandler } from '../capabilities/retail-demo/retail-demo.handler';
import { WhatsAppCapability } from '../types/whatsapp-capability.enum';
import { WhatsAppBotService, KeywordReply } from '../whatsapp-bot.service';
import { WhatsAppMenuService, MenuReply } from '../whatsapp-menu.service';
import { WhatsAppSender } from '../whatsapp.sender';
import { MetaProvider } from '../providers/meta.provider';
import { toWhatsAppPhone, normalizePhone } from '../../../common/utils/phone.util';

// Job card number pattern e.g. AIY-J-2526-0003
const JOB_CARD_PATTERN = /^[a-z0-9]+-j-\d+-\d+$/i;

const JOB_STATUS_LABELS: Record<string, string> = {
  RECEIVED: 'Received — awaiting assignment',
  ASSIGNED: 'Assigned to technician',
  DIAGNOSING: 'Under diagnosis',
  WAITING_APPROVAL: 'Waiting for your approval',
  APPROVED: 'Approved — repair starting',
  WAITING_FOR_PARTS: 'Waiting for parts',
  IN_PROGRESS: 'Repair in progress',
  READY: '✅ Ready for pickup!',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  RETURNED: 'Returned',
  SCRAPPED: 'Scrapped',
  REPAIR_FAILED: 'Repair could not be completed',
  WAITING_CUSTOMER: 'Waiting for customer response',
};

@Injectable()
export class WhatsAppCapabilityRouter {
  private readonly logger = new Logger(WhatsAppCapabilityRouter.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly retailDemoHandler: RetailDemoHandler,
    private readonly botService: WhatsAppBotService,
    private readonly menuService: WhatsAppMenuService,
    private readonly sender: WhatsAppSender,
    private readonly metaProvider: MetaProvider,
  ) {}

  async routeMessage(
    tenantId: string,
    whatsAppNumberId: string,
    phone: string,
    text: string,
  ): Promise<void> {
    const waNumber = await this.prisma.whatsAppNumber.findUnique({
      where: { id: whatsAppNumberId },
    });

    if (!waNumber) {
      this.logger.warn(`Routing failed: Number ${whatsAppNumberId} not found`);
      return;
    }

    let capability = WhatsAppCapability.GYM_PILOT;
    if (waNumber.isSystem) capability = WhatsAppCapability.RETAIL_DEMO;

    this.logger.debug(
      `Routing message from ${phone} [Tenant: ${tenantId}, Number: ${waNumber.displayNumber}] -> ${capability}`,
    );

    // ── HUMAN HANDOVER CHECK ──
    const state = await this.prisma.whatsAppConversationState.findUnique({
      where: { tenantId_phoneNumber: { tenantId, phoneNumber: phone } },
      select: { botPaused: true },
    });
    if (state?.botPaused) {
      this.logger.debug(`[Router] Bot is PAUSED for ${phone} due to human handover.`);
      return;
    }

    switch (capability) {
      case WhatsAppCapability.RETAIL_DEMO:
        await this.retailDemoHandler.handleMessage(tenantId, phone, text);
        break;

      case WhatsAppCapability.GYM_PILOT:
      default: {
        let botReply: MenuReply | KeywordReply | string | null = null;

        // 1. Job card number lookup (highest priority)
        if (JOB_CARD_PATTERN.test(text.trim())) {
          botReply = await this.lookupJobCard(tenantId, text.trim());
        }

        // 2. Menu bot
        if (!botReply) {
          botReply = await this.menuService.processMenuInput(tenantId, phone, text);
        }

        // 3. Keyword bot
        if (!botReply) {
          botReply = await this.botService.matchKeyword(tenantId, text);
        }

        if (botReply) {
          this.logger.log(`[Bot] Sending auto-reply to ${phone} for tenant ${tenantId}`);
          await this.sendBotReply(tenantId, phone, botReply, whatsAppNumberId);
        }
        break;
      }
    }
  }

  /**
   * Sends either an interactive message (when buttons are configured) or plain text.
   * For META_CLOUD numbers with interactive payloads, uses the Meta API directly.
   * Falls back to sendTextMessage for plain text and non-Meta providers.
   */
  private async sendBotReply(
    tenantId: string,
    phone: string,
    reply: MenuReply | KeywordReply | string,
    whatsAppNumberId?: string,
  ): Promise<void> {
    // Normalize to { text, interactive }
    const replyObj: { text: string | null; interactive: Record<string, unknown> | null } =
      typeof reply === 'string'
        ? { text: reply, interactive: null }
        : reply;

    if (replyObj.interactive) {
      // Try to send as interactive (META_CLOUD only)
      try {
        const waNumber = await this.prisma.whatsAppNumber.findFirst({
          where: { tenantId, isEnabled: true, provider: 'META_CLOUD' },
          select: { id: true, phoneNumberId: true, accessToken: true },
        });
        if (waNumber?.phoneNumberId && waNumber.accessToken) {
          const to = toWhatsAppPhone(normalizePhone(phone));
          const result = await this.metaProvider.sendInteractiveMessage({
            phoneNumberId: waNumber.phoneNumberId,
            accessToken: waNumber.accessToken,
            to,
            interactivePayload: replyObj.interactive,
          });
          if (result.success) return;
          // Fall through to plain text on failure
          this.logger.warn(`Interactive send failed, falling back to text: ${result.error}`);
        }
      } catch (err: any) {
        this.logger.warn(`Interactive send error, falling back: ${err.message}`);
      }
    }

    // Plain text fallback
    const textToSend = replyObj.text ?? '';
    if (textToSend) {
      await this.sender.sendTextMessage(tenantId, phone, textToSend, whatsAppNumberId, true);
    }
  }

  private async lookupJobCard(tenantId: string, jobNumber: string): Promise<string | null> {
    try {
      const job = await this.prisma.jobCard.findFirst({
        where: { tenantId, jobNumber: { equals: jobNumber, mode: 'insensitive' }, deletedAt: null },
        select: {
          jobNumber: true,
          customerName: true,
          deviceBrand: true,
          deviceModel: true,
          status: true,
          estimatedCost: true,
          finalCost: true,
          estimatedDelivery: true,
        },
      });

      if (!job) {
        return `Sorry, we couldn't find job card *${jobNumber.toUpperCase()}*. Please check the number and try again.`;
      }

      const statusLabel = JOB_STATUS_LABELS[job.status] ?? job.status;
      const cost = job.finalCost ?? job.estimatedCost;
      const costLine = cost ? `\n💰 Cost: ₹${cost}` : '';
      const deliveryLine = job.estimatedDelivery
        ? `\n📅 Est. delivery: ${new Date(job.estimatedDelivery).toLocaleDateString('en-IN')}`
        : '';

      return `📋 *Job Card: ${job.jobNumber}*\n👤 ${job.customerName}\n📱 ${job.deviceBrand} ${job.deviceModel}\n🔧 Status: ${statusLabel}${costLine}${deliveryLine}`;
    } catch (err) {
      this.logger.error(`Job card lookup failed: ${(err as any)?.message}`);
      return null;
    }
  }
}
