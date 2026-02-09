import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { TenantRequiredGuard } from '../../core/auth/guards/tenant.guard';
import { WhatsAppCrmService } from './whatsapp-crm.service';
import { UserRole } from '@prisma/client';
import { Roles } from '../../core/auth/decorators/roles.decorator';

@Controller('user/whatsapp-crm')
@UseGuards(JwtAuthGuard, TenantRequiredGuard)
@Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.STAFF)
export class WhatsAppCrmController {
  constructor(private readonly whatsappCrmService: WhatsAppCrmService) {}

  /**
   * GET /user/whatsapp-crm/check-status
   * Check WhatsApp CRM subscription and setup status (primary endpoint for frontend)
   */
  @Get('check-status')
  async getStatus(@Req() req: any) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) throw new Error('No tenantId');
      return await this.whatsappCrmService.getStatus(tenantId);
    } catch (error) {
      console.error('Error fetching WhatsApp CRM status:', error);
      // Fallback for demo/error cases to avoid UI crash
      return {
        hasSubscription: false,
        isEnabled: false,
        hasPhoneNumber: false,
        moduleType: 'MOBILE_SHOP',
      };
    }
  }
}
