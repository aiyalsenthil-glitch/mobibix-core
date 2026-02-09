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
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('gym/attendance')
export class GymAttendanceController {
  constructor(private readonly attendanceService: GymAttendanceService) {}

  // ========================
  // AUTHENTICATED (STAFF / OWNER)
  // ========================

  @UseGuards(JwtAuthGuard, PermissionsGuard, TenantStatusGuard)
  @Roles(UserRole.OWNER, UserRole.STAFF)
  @Permissions(Permission.ATTENDANCE_MARK)
  @Post('check-in')
  checkIn(@Req() req: any, @Body('memberId') memberId: string) {
    return this.attendanceService.checkIn(req.user.tenantId, memberId);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard, TenantStatusGuard)
  @Roles(UserRole.OWNER, UserRole.STAFF)
  @Permissions(Permission.ATTENDANCE_MARK)
  @Post('check-out')
  checkOut(@Req() req: any, @Body('memberId') memberId: string) {
    return this.attendanceService.checkOut(req.user.tenantId, memberId);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard, TenantStatusGuard)
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
  @UseGuards(JwtAuthGuard, PermissionsGuard, TenantStatusGuard)
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

  @Post('qr/check')
  checkByQr(@Body() body: { tenantId: string; phone: string }) {
    return this.attendanceService.checkInOrOutByPhone(
      body.tenantId,
      body.phone,
    );
  }
  // ========================
  // CHECKIN CHEKOUT BY STAFF
  // ========================
  @UseGuards(JwtAuthGuard, PermissionsGuard, TenantStatusGuard)
  @Roles(UserRole.OWNER, UserRole.STAFF)
  @Permissions(Permission.ATTENDANCE_MARK)
  @Post('staff/check')
  checkByPhoneStaff(@Req() req: any, @Body('phone') phone: string) {
    return this.attendanceService.checkInOrOutByPhone(req.user.tenantId, phone);
  }

  //Today attendance count
  @UseGuards(JwtAuthGuard, PermissionsGuard, TenantStatusGuard)
  @Roles(UserRole.OWNER, UserRole.STAFF)
  @Permissions(Permission.ATTENDANCE_VIEW)
  @Get('today-count')
  countToday(@Req() req: any) {
    return this.attendanceService.countTodayAttendance(req.user.tenantId);
  }
  //Currently inside count
  @UseGuards(JwtAuthGuard, PermissionsGuard, TenantStatusGuard)
  @Roles(UserRole.OWNER, UserRole.STAFF)
  @Permissions(Permission.ATTENDANCE_VIEW)
  @Get('inside-count')
  countInside(@Req() req: any) {
    return this.attendanceService.countCurrentlyCheckedInMembers(
      req.user.tenantId,
    );
  }
  @UseGuards(JwtAuthGuard, PermissionsGuard, TenantStatusGuard)
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

  @UseGuards(JwtAuthGuard, PermissionsGuard, TenantStatusGuard)
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
