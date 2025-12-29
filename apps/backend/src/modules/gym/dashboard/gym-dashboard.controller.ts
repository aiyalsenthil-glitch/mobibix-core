import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { Permissions } from '../../../core/auth/decorators/permissions.decorator';
import { Permission } from '../../../core/auth/permissions.enum';
import { GymDashboardService } from './gym-dashboard.service';

@Controller('gym/dashboard')
@UseGuards(JwtAuthGuard)
export class GymDashboardController {
  constructor(private readonly dashboardService: GymDashboardService) {}
  @Permissions(Permission.DASHBOARD_VIEW)
  @Get('owner')
  getOwnerDashboard(@Req() req: any) {
    return this.dashboardService.getOwnerDashboard(req.user.tenantId);
  }
}
