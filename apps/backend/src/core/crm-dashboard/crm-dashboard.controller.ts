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
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { TenantRequiredGuard } from '../auth/guards/tenant.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('core/crm-dashboard')
@UseGuards(JwtAuthGuard, RolesGuard, TenantRequiredGuard)
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
