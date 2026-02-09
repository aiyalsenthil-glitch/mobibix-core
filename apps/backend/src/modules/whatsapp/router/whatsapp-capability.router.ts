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
    phone: string,
    text: string,
  ): Promise<void> {
    // 1. Resolve Tenant Type
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { tenantType: true },
    });

    // 2. Determine Capability
    let capability = WhatsAppCapability.GYM_PILOT; // Default Safe Fallback

    if (tenant?.tenantType === 'MOBILE_SHOP') {
      capability = WhatsAppCapability.RETAIL_DEMO;
    }

    this.logger.debug(
      `Routing message from ${phone} [Tenant: ${tenantId}, Type: ${tenant?.tenantType}] -> ${capability}`,
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
