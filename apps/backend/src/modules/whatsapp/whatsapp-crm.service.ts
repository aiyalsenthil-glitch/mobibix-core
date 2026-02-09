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
        whatsappPhoneNumberId: true,
        tenantType: true,
      },
    });

    return {
      hasSubscription,
      isEnabled: tenant?.whatsappCrmEnabled ?? false,
      hasPhoneNumber: !!tenant?.whatsappPhoneNumberId,
      moduleType: tenant?.tenantType?.toUpperCase(),
      canPreview: !hasSubscription,
    };
  }
}
