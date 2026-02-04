import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { PrismaService } from '../../core/prisma/prisma.service';
import { PlanRulesService } from '../../core/billing/plan-rules.service';
import { ModuleType } from '@prisma/client';

@Controller('user/whatsapp-crm')
@UseGuards(JwtAuthGuard)
export class WhatsAppCrmController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly planRulesService: PlanRulesService,
  ) {}

  /**
   * GET /user/whatsapp-crm/status
   * Check WhatsApp CRM subscription and setup status
   */
  @Get('status')
  async getCrmStatus(@Req() req: any) {
    const userId = req.user.sub;
    const tenantId = req.user.tenantId;

    if (!tenantId) {
      return {
        hasSubscription: false,
        isEnabled: false,
        hasPhoneNumber: false,
      };
    }

    // Check if tenant has WHATSAPP_CRM subscription
    const subscription = await this.prisma.tenantSubscription.findFirst({
      where: {
        tenantId,
        module: ModuleType.WHATSAPP_CRM,
        status: { in: ['ACTIVE', 'TRIAL'] },
      },
    });

    const hasSubscription = !!subscription;

    // Check if WhatsApp CRM is enabled on tenant
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { whatsappCrmEnabled: true, whatsappPhoneNumberId: true },
    });

    const isEnabled = hasSubscription && tenant?.whatsappCrmEnabled;
    const hasPhoneNumber = !!tenant?.whatsappPhoneNumberId;

    return {
      hasSubscription,
      isEnabled,
      hasPhoneNumber,
    };
  }
}
