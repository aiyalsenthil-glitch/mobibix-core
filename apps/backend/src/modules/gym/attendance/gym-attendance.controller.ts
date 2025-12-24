import { Controller, Post, Body, Req, UseGuards, Get } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { Permissions } from '../../../core/auth/decorators/permissions.decorator';
import { Permission } from '../../../core/auth/permissions.enum';
import { GymAttendanceService } from './gym-attendance.service';

@Controller('gym/attendance')
@UseGuards(JwtAuthGuard)
export class GymAttendanceController {
  constructor(private readonly attendanceService: GymAttendanceService) {}

  @Permissions(Permission.ATTENDANCE_MARK)
  @Post('check-in')
  checkIn(@Req() req: any, @Body('memberId') memberId: string) {
    return this.attendanceService.checkIn(req.user.tenantId, memberId);
  }

  @Permissions(Permission.ATTENDANCE_MARK)
  @Post('check-out')
  checkOut(@Req() req: any, @Body('memberId') memberId: string) {
    return this.attendanceService.checkOut(req.user.tenantId, memberId);
  }

  @Permissions(Permission.ATTENDANCE_VIEW)
  @Get('today')
  today(@Req() req: any) {
    return this.attendanceService.getTodayAttendance(req.user.tenantId);
  }
}
