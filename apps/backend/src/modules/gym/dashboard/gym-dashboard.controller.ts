import { Controller, Get, UseGuards, Req, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { Permissions } from '../../../core/auth/decorators/permissions.decorator';
import { Permission } from '../../../core/auth/permissions.enum';
import { GymDashboardService } from './gym-dashboard.service';
import { TenantStatusGuard } from '../../../core/tenant/guards/tenant-status.guard';
import { TenantRequiredGuard } from '../../../core/auth/guards/tenant.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { UserRole, ModuleType } from '@prisma/client';
import { ModuleScope } from '../../../core/auth/decorators/module-scope.decorator';

@Controller('gym/dashboard')
@ModuleScope(ModuleType.GYM)
@UseGuards(JwtAuthGuard, TenantStatusGuard, TenantRequiredGuard)
@Roles(UserRole.OWNER, UserRole.STAFF)
export class GymDashboardController {
  constructor(private readonly dashboardService: GymDashboardService) {}
  @Permissions(Permission.DASHBOARD_VIEW)
  @Get('owner')
  getOwnerDashboard(@Req() req: any) {
    return this.dashboardService.getOwnerDashboard(req.user.tenantId);
  }

  @Permissions(Permission.DASHBOARD_VIEW)
  @Get('revenue-chart')
  getRevenueChart(@Req() req: any, @Query('days') days?: string) {
    const numDays = days ? parseInt(days, 10) : 30;
    return this.dashboardService.getRevenueChart(req.user.tenantId, numDays);
  }

  @Permissions(Permission.DASHBOARD_VIEW)
  @Get('attendance-heatmap')
  getAttendanceHeatmap(@Req() req: any, @Query('days') days?: string) {
    const numDays = days ? parseInt(days, 10) : 30;
    return this.dashboardService.getAttendanceHeatmap(
      req.user.tenantId,
      numDays,
    );
  }
}
