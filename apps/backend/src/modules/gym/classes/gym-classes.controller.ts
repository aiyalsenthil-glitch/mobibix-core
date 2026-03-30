import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { GranularPermissionGuard } from '../../../core/permissions/guards/granular-permission.guard';
import { TenantRequiredGuard } from '../../../core/auth/guards/tenant.guard';
import { TenantStatusGuard } from '../../../core/tenant/guards/tenant-status.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { RequirePermission, ModulePermission } from '../../../core/permissions/decorators/require-permission.decorator';
import { ModuleScope } from '../../../core/auth/decorators/module-scope.decorator';
import { PERMISSIONS } from '../../../security/permission-registry';
import { UserRole, ModuleType } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { Public } from '../../../core/auth/decorators/public.decorator';
import { SkipSubscriptionCheck } from '../../../core/auth/decorators/skip-subscription-check.decorator';
import { FitnessJwtGuard } from '../../fitness/guards/fitness-jwt.guard';

// ── Owner-facing class management ────────────────────────────────────────────

@Controller('gym/classes')
@ModuleScope(ModuleType.GYM)
@ModulePermission('gym')
@UseGuards(JwtAuthGuard, RolesGuard, GranularPermissionGuard, TenantRequiredGuard, TenantStatusGuard)
export class GymClassesController {
  constructor(private readonly prisma: PrismaService) {}

  @RequirePermission(PERMISSIONS.GYM.MEMBER.VIEW)
  @Roles(UserRole.OWNER, UserRole.STAFF)
  @Get()
  listClasses(@Req() req: any) {
    return this.prisma.gymClass.findMany({
      where: { tenantId: req.user.tenantId, isActive: true },
      orderBy: { startTime: 'asc' },
    });
  }

  @RequirePermission(PERMISSIONS.GYM.MEMBER.VIEW)
  @Roles(UserRole.OWNER, UserRole.STAFF)
  @Get(':id/bookings')
  async getClassBookings(
    @Req() req: any,
    @Param('id') classId: string,
    @Query('date') date?: string,
  ) {
    const where: any = { classId, gymClass: { tenantId: req.user.tenantId } };
    if (date) {
      const d = new Date(date);
      const next = new Date(d); next.setDate(d.getDate() + 1);
      where.date = { gte: d, lt: next };
    }
    return this.prisma.gymClassBooking.findMany({
      where,
      include: { member: { select: { fullName: true, phone: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  @RequirePermission(PERMISSIONS.GYM.MEMBER.CREATE)
  @Roles(UserRole.OWNER)
  @Post()
  createClass(
    @Req() req: any,
    @Body() body: {
      name: string;
      description?: string;
      trainerName?: string;
      dayOfWeek: number[];
      startTime: string;
      endTime: string;
      maxCapacity?: number;
    },
  ) {
    if (!body.name?.trim()) throw new BadRequestException('Class name is required');
    if (!body.dayOfWeek?.length) throw new BadRequestException('At least one day is required');
    return this.prisma.gymClass.create({
      data: {
        id: `gc_${Date.now().toString(36)}`,
        tenantId: req.user.tenantId,
        name: body.name.trim(),
        description: body.description?.trim() ?? null,
        trainerName: body.trainerName?.trim() ?? null,
        dayOfWeek: body.dayOfWeek,
        startTime: body.startTime,
        endTime: body.endTime,
        maxCapacity: body.maxCapacity ?? 20,
      },
    });
  }

  @RequirePermission(PERMISSIONS.GYM.MEMBER.CREATE)
  @Roles(UserRole.OWNER)
  @Patch(':id')
  async updateClass(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: Partial<{
      name: string; description: string; trainerName: string;
      dayOfWeek: number[]; startTime: string; endTime: string;
      maxCapacity: number; isActive: boolean;
    }>,
  ) {
    const cls = await this.prisma.gymClass.findFirst({ where: { id, tenantId: req.user.tenantId } });
    if (!cls) throw new NotFoundException('Class not found');
    return this.prisma.gymClass.update({ where: { id }, data: body as any });
  }

  @RequirePermission(PERMISSIONS.GYM.MEMBER.CREATE)
  @Roles(UserRole.OWNER)
  @Delete(':id')
  async deleteClass(@Req() req: any, @Param('id') id: string) {
    const cls = await this.prisma.gymClass.findFirst({ where: { id, tenantId: req.user.tenantId } });
    if (!cls) throw new NotFoundException('Class not found');
    // Soft delete
    return this.prisma.gymClass.update({ where: { id }, data: { isActive: false } });
  }

  // Mark a booking as ATTENDED
  @RequirePermission(PERMISSIONS.GYM.MEMBER.CREATE)
  @Roles(UserRole.OWNER, UserRole.STAFF)
  @Patch('bookings/:bookingId/attend')
  async markAttended(@Req() req: any, @Param('bookingId') bookingId: string) {
    const booking = await this.prisma.gymClassBooking.findFirst({
      where: { id: bookingId, gymClass: { tenantId: req.user.tenantId } },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    return this.prisma.gymClassBooking.update({ where: { id: bookingId }, data: { status: 'ATTENDED' } });
  }
}

// ── Leaderboard (owner-facing) ────────────────────────────────────────────────

@Controller('gym/leaderboard')
@ModuleScope(ModuleType.GYM)
@ModulePermission('gym')
@UseGuards(JwtAuthGuard, RolesGuard, GranularPermissionGuard, TenantRequiredGuard, TenantStatusGuard)
export class GymLeaderboardController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /gym/leaderboard?month=2026-03
   * Returns top 10 members by attendance count for the given month.
   */
  @RequirePermission(PERMISSIONS.GYM.MEMBER.VIEW)
  @Roles(UserRole.OWNER, UserRole.STAFF)
  @Get()
  async getLeaderboard(@Req() req: any, @Query('month') month?: string) {
    const tenantId = req.user.tenantId;

    const now = new Date();
    const y = month ? parseInt(month.split('-')[0]) : now.getFullYear();
    const m = month ? parseInt(month.split('-')[1]) - 1 : now.getMonth();
    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 1);

    const rows = await this.prisma.gymAttendance.groupBy({
      by: ['memberId'],
      where: { tenantId, checkInTime: { gte: start, lt: end } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    if (!rows.length) return [];

    const members = await this.prisma.member.findMany({
      where: { id: { in: rows.map(r => r.memberId) } },
      select: { id: true, fullName: true, phone: true },
    });

    const memberMap = new Map(members.map(m => [m.id, m]));

    return rows.map((r, i) => ({
      rank: i + 1,
      memberId: r.memberId,
      name: memberMap.get(r.memberId)?.fullName ?? 'Unknown',
      phone: memberMap.get(r.memberId)?.phone ?? '',
      daysPresent: r._count.id,
      badge: [
        { min: 25, name: 'Platinum', emoji: '🏆' },
        { min: 20, name: 'Gold',     emoji: '🥇' },
        { min: 15, name: 'Silver',   emoji: '🥈' },
        { min: 10, name: 'Bronze',   emoji: '🥉' },
      ].find(b => r._count.id >= b.min) ?? null,
    }));
  }
}

// ── Member-facing class listing + booking ─────────────────────────────────────

@Controller('fitness/classes')
@Public()
@SkipSubscriptionCheck()
@UseGuards(FitnessJwtGuard)
export class FitnessClassesController {
  constructor(private readonly prisma: PrismaService) {}

  /** GET /fitness/classes?tenantCode=XYZ — list active classes for a gym */
  @Get()
  async listClasses(@Req() req: any, @Query('tenantCode') tenantCode: string) {
    if (!tenantCode) throw new BadRequestException('tenantCode is required');
    const tenant = await this.prisma.tenant.findUnique({ where: { code: tenantCode }, select: { id: true } });
    if (!tenant) throw new NotFoundException('Gym not found');
    return this.prisma.gymClass.findMany({
      where: { tenantId: tenant.id, isActive: true },
      orderBy: { startTime: 'asc' },
    });
  }

  /** POST /fitness/classes/:classId/book — book a class session */
  @Post(':classId/book')
  async bookClass(
    @Req() req: any,
    @Param('classId') classId: string,
    @Body() body: { date: string }, // ISO date e.g. "2026-03-30"
  ) {
    const { fitnessProfileId } = req.user;
    if (!body.date) throw new BadRequestException('date is required');

    const cls = await this.prisma.gymClass.findUnique({ where: { id: classId } });
    if (!cls || !cls.isActive) throw new NotFoundException('Class not found');

    // Find the linked member for this gym
    const member = await this.prisma.member.findFirst({
      where: { fitnessProfileId, tenantId: cls.tenantId, isActive: true },
    });
    if (!member) throw new ForbiddenException('You are not a member of this gym');

    // Check capacity
    const existing = await this.prisma.gymClassBooking.count({
      where: { classId, date: new Date(body.date), status: { not: 'CANCELLED' } },
    });
    if (existing >= cls.maxCapacity) throw new BadRequestException('Class is full');

    return this.prisma.gymClassBooking.upsert({
      where: { classId_memberId_date: { classId, memberId: member.id, date: new Date(body.date) } },
      create: {
        id: `gcb_${Date.now().toString(36)}`,
        classId,
        memberId: member.id,
        date: new Date(body.date),
        status: 'BOOKED',
      },
      update: { status: 'BOOKED' }, // re-book if cancelled
    });
  }

  /** DELETE /fitness/classes/bookings/:bookingId — cancel a booking */
  @Delete('bookings/:bookingId')
  async cancelBooking(@Req() req: any, @Param('bookingId') bookingId: string) {
    const { fitnessProfileId } = req.user;
    const booking = await this.prisma.gymClassBooking.findFirst({
      where: { id: bookingId, member: { fitnessProfileId } },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    return this.prisma.gymClassBooking.update({ where: { id: bookingId }, data: { status: 'CANCELLED' } });
  }

  /** GET /fitness/classes/my-bookings — upcoming bookings for the member */
  @Get('my-bookings')
  async myBookings(@Req() req: any) {
    const { fitnessProfileId } = req.user;
    return this.prisma.gymClassBooking.findMany({
      where: {
        member: { fitnessProfileId },
        date: { gte: new Date() },
        status: 'BOOKED',
      },
      include: {
        gymClass: { select: { name: true, startTime: true, endTime: true, trainerName: true } },
      },
      orderBy: { date: 'asc' },
      take: 20,
    });
  }
}
