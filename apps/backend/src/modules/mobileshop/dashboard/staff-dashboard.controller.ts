import {
  Controller,
  Get,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { TenantStatusGuard } from '../../../core/tenant/guards/tenant-status.guard';
import { TenantRequiredGuard } from '../../../core/auth/guards/tenant.guard';
import { GranularPermissionGuard } from '../../../core/permissions/guards/granular-permission.guard';
import { RequirePermission, ModulePermission } from '../../../core/permissions/decorators/require-permission.decorator';
import { PERMISSIONS } from '../../../security/permission-registry';
import { ModuleScope } from '../../../core/auth/decorators/module-scope.decorator';
import { StaffDashboardService } from './staff-dashboard.service';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { UserRole, ModuleType } from '@prisma/client';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { TenantScopedController } from '../../../core/auth/tenant-scoped.controller';

@Controller('mobileshop/dashboard')
@ModuleScope(ModuleType.MOBILE_SHOP)
@ModulePermission('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard, GranularPermissionGuard, TenantStatusGuard, TenantRequiredGuard)
@Roles(UserRole.OWNER, UserRole.STAFF)
export class StaffDashboardController extends TenantScopedController {
  constructor(private readonly service: StaffDashboardService) {
    super();
  }

  @RequirePermission(PERMISSIONS.CORE.DASHBOARD.VIEW)
  @Get('staff')
  async getStaffDashboard(@Req() req: any) {
    const tenantId = this.getTenantId(req);
    const userId = req.user?.id;

    if (!tenantId || !userId) {
      throw new ForbiddenException('INVALID_USER');
    }

    return this.service.getStaffDashboard(tenantId, userId);
  }
}
