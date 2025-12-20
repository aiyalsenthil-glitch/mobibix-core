import { Controller, Post, Body, Req, UseGuards, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { GymAttendanceService } from './gym-attendance.service';

@Controller('gym/attendance')
@UseGuards(JwtAuthGuard)
export class GymAttendanceController {
  constructor(private readonly attendanceService: GymAttendanceService) {}

  @Post('check-in')
  async checkIn(
    @Req() req: any,
    @Body('memberId') memberId: string,
    @Query('source') source?: 'MANUAL' | 'QR' | 'BIOMETRIC',
  ) {
    return this.attendanceService.checkIn(
      req.user.tenantId,
      memberId,
      source ?? 'MANUAL',
    );
  }

  @Post('check-out')
  async checkOut(@Req() req: any, @Body('memberId') memberId: string) {
    return this.attendanceService.checkOut(req.user.tenantId, memberId);
  }
}
