import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../../core/auth/decorators/current-user.decorator';
import { MonthlyReportService } from './monthly-report.service';

import { RolesGuard } from '../../../../core/auth/guards/roles.guard';
import { Roles } from '../../../../core/auth/decorators/roles.decorator';
import { UserRole, ModuleType } from '@prisma/client';
import { ModuleScope } from '../../../../core/auth/decorators/module-scope.decorator';
import { ModulePermission, RequirePermission } from '../../../../core/permissions/decorators/require-permission.decorator';
import { GranularPermissionGuard } from '../../../../core/permissions/guards/granular-permission.guard';
import { TenantRequiredGuard } from '../../../../core/auth/guards/tenant.guard';
import { PERMISSIONS } from '../../../../security/permission-registry';

@Controller('operations/monthly-report')
@ModuleScope(ModuleType.MOBILE_SHOP)
@ModulePermission('report')
@UseGuards(JwtAuthGuard, TenantRequiredGuard, RolesGuard, GranularPermissionGuard)
@Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT)
export class MonthlyReportController {
  constructor(private readonly svc: MonthlyReportService) {}

  /** GET /operations/monthly-report?shopId=&month=3&year=2025 */
  @Get()
  @RequirePermission(PERMISSIONS.CORE.REPORT.VIEW)
  getSummary(
    @CurrentUser() user: any,
    @Query('shopId') shopId: string,
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    return this.svc.getMonthlySummary(
      user.tenantId,
      shopId,
      parseInt(month),
      parseInt(year),
    );
  }

  /** GET /operations/monthly-report/trend?shopId=&months=6 */
  @Get('trend')
  @RequirePermission(PERMISSIONS.CORE.REPORT.VIEW)
  getTrend(
    @CurrentUser() user: any,
    @Query('shopId') shopId: string,
    @Query('months') months?: string,
  ) {
    return this.svc.getMonthlyTrend(
      user.tenantId,
      shopId,
      months ? parseInt(months) : 6,
    );
  }
}
