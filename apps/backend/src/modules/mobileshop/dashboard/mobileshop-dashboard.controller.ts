import { Controller, Get, Req, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { TenantStatusGuard } from '../../../core/tenant/guards/tenant-status.guard';
import { TenantRequiredGuard } from '../../../core/auth/guards/tenant.guard';
import { GranularPermissionGuard } from '../../../core/permissions/guards/granular-permission.guard';
import { RequirePermission, ModulePermission } from '../../../core/permissions/decorators/require-permission.decorator';
import { PERMISSIONS } from '../../../security/permission-registry';
import { MobileShopDashboardService } from './mobileshop-dashboard.service';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { UserRole, ModuleType } from '@prisma/client';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { TenantScopedController } from '../../../core/auth/tenant-scoped.controller';
import { ModuleScope } from '../../../core/auth/decorators/module-scope.decorator';

@Controller('mobileshop/dashboard')
@ModuleScope(ModuleType.MOBILE_SHOP)
@ModulePermission('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard, GranularPermissionGuard, TenantStatusGuard, TenantRequiredGuard)
@Roles(UserRole.OWNER, UserRole.STAFF)
export class MobileShopDashboardController extends TenantScopedController {
  constructor(private readonly dashboardService: MobileShopDashboardService) {
    super();
  }

  @RequirePermission(PERMISSIONS.CORE.DASHBOARD.VIEW)
  @Get('owner')
  getOwnerDashboard(
    @Req() req: any,
    @Query('shopId') shopId?: string,
    @Query('cache') cache?: string,
  ) {
    const skipCache = cache === 'skip';
    const tenantId = this.getTenantId(req);
    return this.dashboardService.getOwnerDashboard(tenantId, shopId, skipCache);
  }

  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @RequirePermission(PERMISSIONS.CORE.DASHBOARD.VIEW)
  @Get('shop-breakdown')
  getShopBreakdown(@Req() req: any) {
    const tenantId = this.getTenantId(req);
    return this.dashboardService.getShopBreakdown(tenantId);
  }
}
