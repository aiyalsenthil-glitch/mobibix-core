import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { RetailDemoHandler } from '../capabilities/retail-demo/retail-demo.handler';
import { WhatsAppCapability } from '../types/whatsapp-capability.enum';

@Injectable()
export class WhatsAppCapabilityRouter {
  private readonly logger = new Logger(WhatsAppCapabilityRouter.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly retailDemoHandler: RetailDemoHandler,
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
      default:
        // EXISTING BEHAVIOR PRESERVATION
        // The current GymPilot system only logs incoming messages in the webhook.
        // We explicitily do NOTHING here so that the loop in the controller
        // can continue (or we just return and let the controller finish).
        this.logger.debug(
          `[GYM_PILOT] Message parsed, no auto-response action taken.`,
        );
        break;
    }
  }
}
