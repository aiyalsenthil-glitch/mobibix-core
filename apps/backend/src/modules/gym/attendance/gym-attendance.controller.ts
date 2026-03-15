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
import { GymAttendanceService } from './gym-attendance.service';
import { TenantStatusGuard } from '../../../core/tenant/guards/tenant-status.guard';
import { TenantRequiredGuard } from '../../../core/auth/guards/tenant.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { UserRole, ModuleType } from '@prisma/client';
import { ModuleScope } from '../../../core/auth/decorators/module-scope.decorator';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { GranularPermissionGuard } from '../../../core/permissions/guards/granular-permission.guard';
import { RequirePermission, ModulePermission } from '../../../core/permissions/decorators/require-permission.decorator';
import { PERMISSIONS } from '../../../security/permission-registry';
import { Public } from '../../../core/auth/decorators/public.decorator';
import { KioskAuthGuard } from '../../../core/auth/guards/kiosk-auth.guard';

@UseGuards(
  JwtAuthGuard,
  TenantRequiredGuard,
  RolesGuard,
  GranularPermissionGuard,
  TenantStatusGuard,
)
@Controller('gym/attendance')
@ModuleScope(ModuleType.GYM)
@ModulePermission('attendance')
export class GymAttendanceController {
  constructor(private readonly attendanceService: GymAttendanceService) {}

  // ========================
  // AUTHENTICATED (STAFF / OWNER)
  // ========================

  @Roles(UserRole.OWNER, UserRole.STAFF)
  @RequirePermission(PERMISSIONS.GYM.ATTENDANCE.MARK)
  @Post('check-in')
  checkIn(@Req() req: any, @Body('memberId') memberId: string) {
    return this.attendanceService.checkIn(req.user.tenantId, memberId);
  }

  @Roles(UserRole.OWNER, UserRole.STAFF)
  @RequirePermission(PERMISSIONS.GYM.ATTENDANCE.MARK)
  @Post('check-out')
  checkOut(@Req() req: any, @Body('memberId') memberId: string) {
    return this.attendanceService.checkOut(req.user.tenantId, memberId);
  }

  @Roles(UserRole.OWNER, UserRole.STAFF)
  @RequirePermission(PERMISSIONS.GYM.ATTENDANCE.VIEW)
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
  @RequirePermission(PERMISSIONS.GYM.ATTENDANCE.VIEW)
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

  /**
   * POST /gym/attendance/kiosk/check/:tenantId
   * Kiosk Mode check-in: uses kioskToken and phone
   */
  @Public()
  @UseGuards(KioskAuthGuard)
  @Post('kiosk/check/:tenantId')
  markKioskAttendance(
    @Param('tenantId') tenantId: string,
    @Body('phone') phone: string,
  ) {
    return this.attendanceService.checkInOrOutByPhone(tenantId, phone);
  }
  // ========================
  // CHECKIN CHEKOUT BY STAFF
  // ========================
  @Roles(UserRole.OWNER, UserRole.STAFF)
  @RequirePermission(PERMISSIONS.GYM.ATTENDANCE.MARK)
  @Post('staff/check')
  checkByPhoneStaff(@Req() req: any, @Body('phone') phone: string) {
    return this.attendanceService.checkInOrOutByPhone(req.user.tenantId, phone);
  }

  //Today attendance count
  @Roles(UserRole.OWNER, UserRole.STAFF)
  @RequirePermission(PERMISSIONS.GYM.ATTENDANCE.VIEW)
  @Get('today-count')
  countToday(@Req() req: any) {
    return this.attendanceService.countTodayAttendance(req.user.tenantId);
  }
  //Currently inside count
  @Roles(UserRole.OWNER, UserRole.STAFF)
  @RequirePermission(PERMISSIONS.GYM.ATTENDANCE.VIEW)
  @Get('inside-count')
  countInside(@Req() req: any) {
    return this.attendanceService.countCurrentlyCheckedInMembers(
      req.user.tenantId,
    );
  }
  @Roles(UserRole.OWNER, UserRole.STAFF)
  @RequirePermission(PERMISSIONS.GYM.ATTENDANCE.VIEW)
  @Get('member/:memberId/recent')
  getRecentForMember(@Req() req: any, @Param('memberId') memberId: string) {
    return this.attendanceService.getRecentAttendanceForMember(
      req.user.tenantId,
      memberId,
      5,
    );
  }

  @Roles(UserRole.OWNER, UserRole.STAFF)
  @RequirePermission(PERMISSIONS.GYM.ATTENDANCE.VIEW)
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
