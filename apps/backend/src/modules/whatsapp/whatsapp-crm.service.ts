import { Injectable } from '@nestjs/common';
import { ModuleType } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { SubscriptionsService } from '../../core/billing/subscriptions/subscriptions.service';

@Injectable()
export class WhatsAppCrmService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  async getStatus(tenantId: string) {
    // Check subscription
    const subscription =
      await this.subscriptionsService.getCurrentActiveSubscription(
        tenantId,
        ModuleType.WHATSAPP_CRM,
      );

    const hasSubscription = !!subscription;

    // Check tenant flags
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        whatsappCrmEnabled: true,
        tenantType: true,
      },
    });

    // ── FIX: Check WhatsAppPhoneNumber table instead of deprecated field ──
    const activeNumber = await this.prisma.whatsAppPhoneNumber.findFirst({
      where: { tenantId, isActive: true },
      select: { id: true },
    });

    return {
      hasSubscription,
      isEnabled: tenant?.whatsappCrmEnabled ?? false,
      hasPhoneNumber: !!activeNumber,
      moduleType: tenant?.tenantType?.toUpperCase(),
      canPreview: !hasSubscription,
    };
  }
}
