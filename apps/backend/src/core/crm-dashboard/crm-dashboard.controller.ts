import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CrmDashboardService } from './crm-dashboard.service';
import { DashboardQueryDto } from './dto/dashboard-query.dto';
import { CrmDashboardResponse } from './dto/dashboard-response.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { TenantRequiredGuard } from '../auth/guards/tenant.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantStatusGuard } from '../tenant/guards/tenant-status.guard';
import { ModulePermission, RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { GranularPermissionGuard } from '../permissions/guards/granular-permission.guard';
import { PERMISSIONS } from '../../security/permission-registry';
import { ModuleScope } from '../auth/decorators/module-scope.decorator';
import { ModuleType, UserRole } from '@prisma/client';

@Controller('core/crm-dashboard')
@ModuleScope(ModuleType.MOBILE_SHOP)
@ModulePermission('crm')
@UseGuards(JwtAuthGuard, RolesGuard, TenantRequiredGuard, TenantStatusGuard, GranularPermissionGuard)
@Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
export class CrmDashboardController {
  constructor(private readonly dashboardService: CrmDashboardService) {}

  /**
   * GET /api/core/crm-dashboard
   * Get CRM dashboard metrics
   *
   * @access OWNER, ADMIN, STAFF
   * @returns Comprehensive dashboard with customer, follow-up, financial, loyalty, WhatsApp KPIs
   */
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.CRM.VIEW)
  @Get()
  async getDashboard(
    @Request() req,
    @Query() query: DashboardQueryDto,
  ): Promise<CrmDashboardResponse> {
    const tenantId = req.user.tenantId;
    const role = req.user.role as UserRole;

    // ✅ Access check: Authenticated users can access, but service handles filtering
    return this.dashboardService.getDashboardMetrics(tenantId, query, role);
  }
}
