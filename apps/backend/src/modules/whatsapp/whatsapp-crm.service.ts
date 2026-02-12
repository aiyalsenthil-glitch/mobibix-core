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
    // 1. Check for standalone WhatsApp CRM subscription
    let subscription = await this.subscriptionsService.getCurrentActiveSubscription(
      tenantId,
      ModuleType.WHATSAPP_CRM,
    );

    // 2. If not found, check if primary subscription has WhatsApp addon
    if (!subscription) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { tenantType: true },
      });
      const type = tenant?.tenantType?.toUpperCase();
      const primaryModule = (type === 'BUSINESS' || type === 'MOBILE_SHOP') ? ModuleType.MOBILE_SHOP : ModuleType.GYM;
      
      const primarySub = await this.subscriptionsService.getCurrentActiveSubscription(
        tenantId,
        primaryModule,
      );

      // Check if primary sub has a WhatsApp CRM addon
      if (primarySub?.addons) {
        const whatsappAddon = primarySub.addons.find(
          a => a.addonPlan.module === ModuleType.WHATSAPP_CRM && a.status === 'ACTIVE'
        );
        if (whatsappAddon) {
          subscription = primarySub; // Treat as having access
        }
      }
    }

    const hasSubscription = !!subscription;

    // Check tenant flags
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        whatsappCrmEnabled: true,
        tenantType: true,
      },
    });

    // ── FIX: Check WhatsAppNumber table instead of deprecated field ──
    const activeNumber = await this.prisma.whatsAppNumber.findFirst({
      where: { tenantId, isEnabled: true },
      select: { id: true, phoneNumber: true },
    });

    return {
      hasSubscription,
      isEnabled: tenant?.whatsappCrmEnabled ?? false,
      hasPhoneNumber: !!activeNumber,
      phoneNumber: activeNumber?.phoneNumber ?? null,
      moduleType: tenant?.tenantType?.toUpperCase(),
      canPreview: !hasSubscription,
      whatsappAllowed: hasSubscription,
    };
  }
}
