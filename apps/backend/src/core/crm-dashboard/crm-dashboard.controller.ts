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

@Controller('core/crm-dashboard')
@UseGuards(JwtAuthGuard)
export class CrmDashboardController {
  constructor(private readonly dashboardService: CrmDashboardService) {}

  /**
   * GET /api/core/crm-dashboard
   * Get CRM dashboard metrics
   *
   * @access OWNER, ADMIN only
   * @returns Comprehensive dashboard with customer, follow-up, financial, loyalty, WhatsApp KPIs
   */
  @Get()
  async getDashboard(
    @Request() req,
    @Query() query: DashboardQueryDto,
  ): Promise<CrmDashboardResponse> {
    const tenantId = req.user.tenantId;
    const role = req.user.role as UserRole;

    // ✅ Role check: Only OWNER or ADMIN can access dashboard
    if (role !== UserRole.OWNER && role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'Only Owners and Admins can access CRM dashboard',
      );
    }

    return this.dashboardService.getDashboardMetrics(tenantId, query);
  }
}
