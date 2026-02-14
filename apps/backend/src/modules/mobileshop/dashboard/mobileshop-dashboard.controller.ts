import { Controller, Get, Req, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { TenantStatusGuard } from '../../../core/tenant/guards/tenant-status.guard';
import { TenantRequiredGuard } from '../../../core/auth/guards/tenant.guard';
import { Permissions } from '../../../core/auth/decorators/permissions.decorator';
import { Permission } from '../../../core/auth/permissions.enum';
import { MobileShopDashboardService } from './mobileshop-dashboard.service';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { UserRole, ModuleType } from '@prisma/client';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { TenantScopedController } from '../../../core/auth/tenant-scoped.controller';
import { ModuleScope } from '../../../core/auth/decorators/module-scope.decorator';

@Controller('mobileshop/dashboard')
@ModuleScope(ModuleType.MOBILE_SHOP)
@UseGuards(JwtAuthGuard, RolesGuard, TenantStatusGuard, TenantRequiredGuard)
@Roles(UserRole.OWNER, UserRole.STAFF)
export class MobileShopDashboardController extends TenantScopedController {
  constructor(private readonly dashboardService: MobileShopDashboardService) {
    super();
  }

  @Permissions(Permission.DASHBOARD_VIEW)
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
}
