import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  Get,
  Headers,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { Permissions } from '../../../core/auth/decorators/permissions.decorator';
import { Permission } from '../../../core/auth/permissions.enum';
import { GymAttendanceService } from './gym-attendance.service';

@Controller('gym/attendance')
export class GymAttendanceController {
  constructor(private readonly attendanceService: GymAttendanceService) {}

  // ========================
  // AUTHENTICATED (STAFF / OWNER)
  // ========================

  @UseGuards(JwtAuthGuard)
  @Permissions(Permission.ATTENDANCE_MARK)
  @Post('check-in')
  checkIn(@Req() req: any, @Body('memberId') memberId: string) {
    return this.attendanceService.checkIn(req.user.tenantId, memberId);
  }

  @UseGuards(JwtAuthGuard)
  @Permissions(Permission.ATTENDANCE_MARK)
  @Post('check-out')
  checkOut(@Req() req: any, @Body('memberId') memberId: string) {
    return this.attendanceService.checkOut(req.user.tenantId, memberId);
  }

  @UseGuards(JwtAuthGuard)
  @Permissions(Permission.ATTENDANCE_VIEW)
  @Get('today')
  today(@Req() req: any) {
    return this.attendanceService.getTodayAttendance(req.user.tenantId);
  }

  // ========================
  // KIOSK / QR (NO JWT)
  // ========================

  @Post('qr/check-in')
  checkInByQr(
    @Headers('x-kiosk-token') kioskToken: string,
    @Body() body: { phone: string },
  ) {
    return this.attendanceService.checkInByKiosk(kioskToken, body.phone);
  }

  @Post('qr/check-out')
  checkOutByQr(
    @Headers('x-kiosk-token') kioskToken: string,
    @Body() body: { phone: string },
  ) {
    return this.attendanceService.checkOutByPhoneByKiosk(
      kioskToken,
      body.phone,
    );
  }
}
