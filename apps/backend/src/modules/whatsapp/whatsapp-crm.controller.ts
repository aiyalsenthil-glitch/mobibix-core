import { Controller, Get, Logger, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { TenantRequiredGuard } from '../../core/auth/guards/tenant.guard';
import { WhatsAppCrmService } from './whatsapp-crm.service';
import { Roles } from '../../core/auth/decorators/roles.decorator';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { GranularPermissionGuard } from '../../core/permissions/guards/granular-permission.guard';
import { RequirePermission, ModulePermission } from '../../core/permissions/decorators/require-permission.decorator';
import { PERMISSIONS } from '../../security/permission-registry';
import { ModuleScope } from '../../core/auth/decorators/module-scope.decorator';
import { ModuleType, UserRole } from '@prisma/client';

@Controller('user/whatsapp-crm')
@ModuleScope(ModuleType.MOBILE_SHOP)
@ModulePermission('whatsapp')
@UseGuards(JwtAuthGuard, TenantRequiredGuard, RolesGuard, GranularPermissionGuard)
@Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.STAFF)
export class WhatsAppCrmController {
  private readonly logger = new Logger(WhatsAppCrmController.name);

  constructor(private readonly whatsappCrmService: WhatsAppCrmService) {}

  /**
   * GET /user/whatsapp-crm/check-status
   * Check WhatsApp CRM subscription and setup status (primary endpoint for frontend)
   */
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.WHATSAPP.VIEW_DASHBOARD)
  @Get('check-status')
  async getStatus(@Req() req: any) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) throw new Error('No tenantId');
      return await this.whatsappCrmService.getStatus(tenantId);
    } catch (error) {
      this.logger.error('Error fetching WhatsApp CRM status', error instanceof Error ? error.stack : error);
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
