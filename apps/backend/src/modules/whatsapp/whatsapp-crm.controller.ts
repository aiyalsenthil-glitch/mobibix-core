import { Controller, Get, Logger, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { TenantRequiredGuard } from '../../core/auth/guards/tenant.guard';
import { WhatsAppCrmService } from './whatsapp-crm.service';
import { Roles } from '../../core/auth/decorators/roles.decorator';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { SkipSubscriptionCheck } from '../../core/auth/decorators/skip-subscription-check.decorator';
import { UserRole } from '@prisma/client';

@Controller('user/whatsapp-crm')
@SkipSubscriptionCheck()
@UseGuards(JwtAuthGuard, TenantRequiredGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.STAFF)
export class WhatsAppCrmController {
  private readonly logger = new Logger(WhatsAppCrmController.name);

  constructor(private readonly whatsappCrmService: WhatsAppCrmService) {}

  /**
   * GET /user/whatsapp-crm/check-status
   * Check WhatsApp CRM subscription and setup status for any module (GYM or MOBILE_SHOP).
   * @SkipSubscriptionCheck — this endpoint checks whether you HAVE a subscription, so no module gate needed.
   */
  @Get('check-status')
  async getStatus(@Req() req: any) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) throw new Error('No tenantId');
      return await this.whatsappCrmService.getStatus(tenantId);
    } catch (error) {
      this.logger.error('Error fetching WhatsApp CRM status', error instanceof Error ? error.stack : error);
      return {
        hasSubscription: false,
        isEnabled: false,
        hasPhoneNumber: false,
        moduleType: 'GYM',
      };
    }
  }
}
