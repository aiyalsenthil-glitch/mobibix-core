import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { GymDashboardService } from './gym-dashboard.service';

@Controller('gym/dashboard')
@UseGuards(JwtAuthGuard)
export class GymDashboardController {
  constructor(private readonly dashboardService: GymDashboardService) {}

  @Get('owner')
  async ownerDashboard() {
    return this.dashboardService.getOwnerDashboard();
  }

  @Get('expiring-soon')
  async expiringSoon() {
    return {
      days: 3,
      items: await this.dashboardService.listExpiringSoon(3),
    };
  }
  @Get('today-attendance-list')
  async todayAttendanceList() {
    return {
      items: await this.dashboardService.todayAttendanceList(),
    };
  }
}
