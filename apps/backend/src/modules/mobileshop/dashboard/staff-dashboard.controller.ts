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
import { Permissions } from '../../../core/auth/decorators/permissions.decorator';
import { Permission } from '../../../core/auth/permissions.enum';
import { StaffDashboardService } from './staff-dashboard.service';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { TenantScopedController } from '../../../core/auth/tenant-scoped.controller';

@Controller('mobileshop/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard, TenantStatusGuard, TenantRequiredGuard)
@Roles(UserRole.OWNER, UserRole.STAFF)
export class StaffDashboardController extends TenantScopedController {
  constructor(private readonly service: StaffDashboardService) {
    super();
  }

  @Permissions(Permission.DASHBOARD_VIEW)
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
