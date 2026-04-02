import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { RetailDemoHandler } from '../capabilities/retail-demo/retail-demo.handler';
import { WhatsAppCapability } from '../types/whatsapp-capability.enum';
import { WhatsAppBotService } from '../whatsapp-bot.service';
import { WhatsAppMenuService } from '../whatsapp-menu.service';
import { WhatsAppSender } from '../whatsapp.sender';

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

    switch (capability) {
      case WhatsAppCapability.RETAIL_DEMO:
        await this.retailDemoHandler.handleMessage(tenantId, phone, text);
        break;

      case WhatsAppCapability.GYM_PILOT:
      default: {
        let botReply: string | null = null;

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
          await this.sender.sendTextMessage(tenantId, phone, botReply, undefined, true);
        }
        break;
      }
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
