import { Controller, Get, Req, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { TenantStatusGuard } from '../../../core/tenant/guards/tenant-status.guard';
import { TenantRequiredGuard } from '../../../core/auth/guards/tenant.guard';
import { Permissions } from '../../../core/auth/decorators/permissions.decorator';
import { Permission } from '../../../core/auth/permissions.enum';
import { MobileShopDashboardService } from './mobileshop-dashboard.service';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('mobileshop/dashboard')
@UseGuards(JwtAuthGuard, TenantStatusGuard, TenantRequiredGuard)
@Roles(UserRole.OWNER, UserRole.STAFF)
export class MobileShopDashboardController {
  constructor(private readonly dashboardService: MobileShopDashboardService) {}

  @Permissions(Permission.DASHBOARD_VIEW)
  @Get('owner')
  getOwnerDashboard(@Req() req: any, @Query('shopId') shopId?: string, @Query('cache') cache?: string) {
    const skipCache = cache === 'skip';
    return this.dashboardService.getOwnerDashboard(req.user.tenantId, shopId, skipCache);
  }
}
