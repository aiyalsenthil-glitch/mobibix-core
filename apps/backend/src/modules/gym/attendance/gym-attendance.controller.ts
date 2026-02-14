import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { Permissions } from '../../../core/auth/decorators/permissions.decorator';
import { Permission } from '../../../core/auth/permissions.enum';
import { GymAttendanceService } from './gym-attendance.service';
import { PermissionsGuard } from '../../../core/auth/guards/permissions.guard';
import { TenantStatusGuard } from '../../../core/tenant/guards/tenant-status.guard';
import { TenantRequiredGuard } from '../../../core/auth/guards/tenant.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { UserRole, ModuleType } from '@prisma/client';
import { ModuleScope } from '../../../core/auth/decorators/module-scope.decorator';

@UseGuards(
  JwtAuthGuard,
  TenantRequiredGuard,
  PermissionsGuard,
  TenantStatusGuard,
)
@Controller('gym/attendance')
@ModuleScope(ModuleType.GYM)
export class GymAttendanceController {
  constructor(private readonly attendanceService: GymAttendanceService) {}

  // ========================
  // AUTHENTICATED (STAFF / OWNER)
  // ========================

  @Roles(UserRole.OWNER, UserRole.STAFF)
  @Permissions(Permission.ATTENDANCE_MARK)
  @Post('check-in')
  checkIn(@Req() req: any, @Body('memberId') memberId: string) {
    return this.attendanceService.checkIn(req.user.tenantId, memberId);
  }

  @Roles(UserRole.OWNER, UserRole.STAFF)
  @Permissions(Permission.ATTENDANCE_MARK)
  @Post('check-out')
  checkOut(@Req() req: any, @Body('memberId') memberId: string) {
    return this.attendanceService.checkOut(req.user.tenantId, memberId);
  }

  @Roles(UserRole.OWNER, UserRole.STAFF)
  @Permissions(Permission.ATTENDANCE_VIEW)
  @Get('today')
  today(
    @Req() req: any,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.attendanceService.listTodayAttendance(req.user.tenantId, {
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }
  // ========================
  // STATUS BY PHONE
  // ========================
  @Roles(UserRole.OWNER, UserRole.STAFF)
  @Permissions(Permission.ATTENDANCE_VIEW)
  @Get('status-by-phone/:phone')
  getStatusByPhone(@Req() req: any, @Param('phone') phone: string) {
    return this.attendanceService.getAttendanceStatusByPhone(
      req.user.tenantId,
      phone,
    );
  }

  // ========================
  // KIOSK / QR (NO JWT)
  // ========================

  /**
   * POST /gym/attendance/qr/check
   * QR code check-in: Accept tenantCode (user-friendly)
   * Look up tenant by code, then use resolved tenantId
   *
   * ✅ SECURITY: Prevents QR holder from spoofing arbitrary tenantId
   */
  @Post('qr/check')
  checkByQr(
    @Req() req: any,
    @Body() body: { tenantCode: string; phone: string },
  ) {
    return this.attendanceService.checkInOrOutByPhoneByTenantCode(
      body.tenantCode,
      body.phone,
    );
  }
  // ========================
  // CHECKIN CHEKOUT BY STAFF
  // ========================
  @Roles(UserRole.OWNER, UserRole.STAFF)
  @Permissions(Permission.ATTENDANCE_MARK)
  @Post('staff/check')
  checkByPhoneStaff(@Req() req: any, @Body('phone') phone: string) {
    return this.attendanceService.checkInOrOutByPhone(req.user.tenantId, phone);
  }

  //Today attendance count
  @Roles(UserRole.OWNER, UserRole.STAFF)
  @Permissions(Permission.ATTENDANCE_VIEW)
  @Get('today-count')
  countToday(@Req() req: any) {
    return this.attendanceService.countTodayAttendance(req.user.tenantId);
  }
  //Currently inside count
  @Roles(UserRole.OWNER, UserRole.STAFF)
  @Permissions(Permission.ATTENDANCE_VIEW)
  @Get('inside-count')
  countInside(@Req() req: any) {
    return this.attendanceService.countCurrentlyCheckedInMembers(
      req.user.tenantId,
    );
  }
  @Roles(UserRole.OWNER, UserRole.STAFF)
  @Permissions(Permission.ATTENDANCE_VIEW)
  @Get('member/:memberId/recent')
  getRecentForMember(@Req() req: any, @Param('memberId') memberId: string) {
    return this.attendanceService.getRecentAttendanceForMember(
      req.user.tenantId,
      memberId,
      5,
    );
  }

  @Roles(UserRole.OWNER, UserRole.STAFF)
  @Permissions(Permission.ATTENDANCE_VIEW)
  @Get('inside-members')
  getInsideMembers(
    @Req() req: any,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.attendanceService.listCurrentlyCheckedInMembers(
      req.user.tenantId,
      {
        skip: skip ? parseInt(skip, 10) : undefined,
        take: take ? parseInt(take, 10) : undefined,
      },
    );
  }
}
