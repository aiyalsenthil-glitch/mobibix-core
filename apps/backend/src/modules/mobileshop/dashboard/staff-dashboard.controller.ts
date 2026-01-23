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

@Controller('mobileshop/dashboard')
@UseGuards(JwtAuthGuard, TenantStatusGuard, TenantRequiredGuard)
export class StaffDashboardController {
  constructor(private readonly service: StaffDashboardService) {}

  @Permissions(Permission.DASHBOARD_VIEW)
  @Get('staff')
  async getStaffDashboard(@Req() req: any) {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;

    if (!tenantId || !userId) {
      throw new ForbiddenException('INVALID_USER');
    }

    return this.service.getStaffDashboard(tenantId, userId);
  }
}
