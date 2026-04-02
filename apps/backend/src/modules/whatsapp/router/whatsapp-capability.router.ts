import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { RetailDemoHandler } from '../capabilities/retail-demo/retail-demo.handler';
import { WhatsAppCapability } from '../types/whatsapp-capability.enum';
import { WhatsAppBotService } from '../whatsapp-bot.service';
import { WhatsAppMenuService } from '../whatsapp-menu.service';
import { WhatsAppSender } from '../whatsapp.sender';

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
    // 1. Load WhatsApp Number Config
    const waNumber = await this.prisma.whatsAppNumber.findUnique({
      where: { id: whatsAppNumberId },
    });

    if (!waNumber) {
      this.logger.warn(`Routing failed: Number ${whatsAppNumberId} not found`);
      return;
    }

    // 2. Determine Capability
    let capability = WhatsAppCapability.GYM_PILOT; // Default to Tenant CRM/Automation

    if (waNumber.isSystem) {
      // System numbers are for the Retail Demo / Shared Service
      capability = WhatsAppCapability.RETAIL_DEMO;
    } else {
      // Tenant numbers get CRM/Automation features
      // Fallback for Mobile Shop specific logic if needed, but generally correct
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { tenantType: true },
      });
      if (tenant?.tenantType === 'MOBILE_SHOP') {
        // Even on their own number, Mobile Shop might want the bot?
        // For now, let's assume Tenant Number = Full Control = CRM (Gym Pilot behavior)
        // But preserving legacy check just in case:
        // capability = WhatsAppCapability.RETAIL_DEMO; // UNCOMMENT IF THEY NEED BOT ON OWN NUMBER
      }
    }

    this.logger.debug(
      `Routing message from ${phone} [Tenant: ${tenantId}, Number: ${waNumber.displayNumber}, System: ${waNumber.isSystem}] -> ${capability}`,
    );

    // 3. Dispatch
    switch (capability) {
      case WhatsAppCapability.RETAIL_DEMO:
        await this.retailDemoHandler.handleMessage(tenantId, phone, text);
        break;

      case WhatsAppCapability.GYM_PILOT:
      default: {
        // 1. Menu bot (hierarchical) — runs first
        const menuReply = await this.menuService.processMenuInput(tenantId, phone, text);
        if (menuReply) {
          this.logger.log(`[MenuBot] Menu reply for tenant ${tenantId}`);
          await this.sender.sendTextMessage(tenantId, phone, menuReply);
          break;
        }

        // 2. Keyword auto-reply bot — fallback
        const reply = await this.botService.matchKeyword(tenantId, text);
        if (reply) {
          this.logger.log(`[Bot] Keyword matched for tenant ${tenantId} → sending auto-reply`);
          await this.sender.sendTextMessage(tenantId, phone, reply);
        }
        break;
      }
    }
  }
}
