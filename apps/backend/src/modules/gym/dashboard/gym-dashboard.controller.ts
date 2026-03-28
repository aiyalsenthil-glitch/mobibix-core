import { Controller, Get, UseGuards, Req, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { GymDashboardService } from './gym-dashboard.service';
import { TenantStatusGuard } from '../../../core/tenant/guards/tenant-status.guard';
import { TenantRequiredGuard } from '../../../core/auth/guards/tenant.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { UserRole, ModuleType } from '@prisma/client';
import { ModuleScope } from '../../../core/auth/decorators/module-scope.decorator';
import { GranularPermissionGuard } from '../../../core/permissions/guards/granular-permission.guard';
import { RequirePermission, ModulePermission } from '../../../core/permissions/decorators/require-permission.decorator';
import { PERMISSIONS } from '../../../security/permission-registry';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';

@Controller('gym/dashboard')
@ModuleScope(ModuleType.GYM)
@ModulePermission('dashboard')
@UseGuards(
  JwtAuthGuard,
  TenantRequiredGuard,
  RolesGuard,
  GranularPermissionGuard,
  TenantStatusGuard,
)
@Roles(UserRole.OWNER, UserRole.STAFF)
export class GymDashboardController {
  constructor(private readonly dashboardService: GymDashboardService) {}
  @RequirePermission(PERMISSIONS.CORE.DASHBOARD.VIEW)
  @Get('owner')
  getOwnerDashboard(@Req() req: any) {
    return this.dashboardService.getOwnerDashboard(req.user.tenantId);
  }

  @RequirePermission(PERMISSIONS.CORE.DASHBOARD.VIEW)
  @Get('revenue-chart')
  getRevenueChart(@Req() req: any, @Query('days') days?: string) {
    const numDays = days ? parseInt(days, 10) : 30;
    return this.dashboardService.getRevenueChart(req.user.tenantId, numDays);
  }

  @RequirePermission(PERMISSIONS.CORE.DASHBOARD.VIEW)
  @Get('attendance-heatmap')
  getAttendanceHeatmap(@Req() req: any, @Query('days') days?: string) {
    const numDays = days ? parseInt(days, 10) : 30;
    return this.dashboardService.getAttendanceHeatmap(
      req.user.tenantId,
      numDays,
    );
  }

  // Daily cash collection report
  @RequirePermission(PERMISSIONS.CORE.DASHBOARD.VIEW)
  @Get('daily-collection')
  getDailyCollection(@Req() req: any, @Query('date') date?: string) {
    return this.dashboardService.getDailyCollection(req.user.tenantId, date);
  }

  // Android app quick-count endpoints
  @RequirePermission(PERMISSIONS.CORE.DASHBOARD.VIEW)
  @Get('membership-due')
  getMembershipDueCount(@Req() req: any) {
    return this.dashboardService.getMembershipDueCount(req.user.tenantId);
  }

  @RequirePermission(PERMISSIONS.CORE.DASHBOARD.VIEW)
  @Get('payment-pending')
  getPaymentPendingCount(@Req() req: any) {
    return this.dashboardService.getPaymentPendingCount(req.user.tenantId);
  }

  @RequirePermission(PERMISSIONS.CORE.DASHBOARD.VIEW)
  @Get('expiring-week')
  getExpiringThisWeekCount(@Req() req: any) {
    return this.dashboardService.getExpiringThisWeekCount(req.user.tenantId);
  }
}
