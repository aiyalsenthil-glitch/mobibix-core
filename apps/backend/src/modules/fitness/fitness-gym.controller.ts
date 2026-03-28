import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Public } from '../../core/auth/decorators/public.decorator';
import { SkipSubscriptionCheck } from '../../core/auth/decorators/skip-subscription-check.decorator';
import { FitnessJwtGuard } from './guards/fitness-jwt.guard';
import { PrismaService } from '../../core/prisma/prisma.service';

@Controller('fitness/gym')
@Public()
@SkipSubscriptionCheck()
@UseGuards(FitnessJwtGuard)
export class FitnessGymController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * POST /fitness/gym/join
   * Links FitnessProfile → Member by tenantCode + phone.
   * Member must already exist in the gym (created by owner/staff).
   */
  @Post('join')
  async joinGym(
    @Req() req: any,
    @Body() body: { tenantCode: string; phone: string; name?: string },
  ) {
    const { fitnessProfileId } = req.user;
    const { tenantCode, phone } = body;

    if (!tenantCode?.trim() || !phone?.trim()) {
      throw new BadRequestException('tenantCode and phone are required');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { code: tenantCode.trim() },
      select: { id: true, name: true },
    });
    if (!tenant) throw new NotFoundException('Gym not found. Check the QR code or contact your gym.');

    const member = await this.prisma.member.findFirst({
      where: {
        tenantId: tenant.id,
        phone: phone.trim(),
        isActive: true,
      },
      select: { id: true, fullName: true, phone: true, fitnessProfileId: true },
    });

    if (!member) {
      throw new NotFoundException('No active member found with this phone number. Contact your gym front desk.');
    }

    if (member.fitnessProfileId && member.fitnessProfileId !== fitnessProfileId) {
      throw new BadRequestException('This membership is already linked to another account.');
    }

    await this.prisma.member.update({
      where: { id: member.id },
      data: { fitnessProfileId },
    });

    // Update profile phone/name if not set
    await this.prisma.fitnessProfile.update({
      where: { id: fitnessProfileId },
      data: {
        phone: phone.trim(),
        ...(body.name && { fullName: body.name }),
      },
    });

    return { success: true, gym: { id: tenant.id, name: tenant.name }, memberName: member.fullName };
  }

  /**
   * GET /fitness/gym/status
   * Returns the member's gym card: membership info + attendance count this month.
   */
  @Get('status')
  async getGymStatus(@Req() req: any) {
    const { fitnessProfileId } = req.user;

    const members = await this.prisma.member.findMany({
      where: { fitnessProfileId, isActive: true },
      select: {
        id: true,
        fullName: true,
        membershipStartAt: true,
        membershipEndAt: true,
        paymentStatus: true,
        isFrozen: true,
        membershipPlanId: true,
        tenant: { select: { id: true, name: true, code: true } },
        attendances: {
          where: {
            checkInTime: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            },
          },
          select: { id: true, checkInTime: true },
          orderBy: { checkInTime: 'desc' },
        },
      },
    });

    if (!members.length) {
      return { linked: false };
    }

    return {
      linked: true,
      gyms: members.map((m) => ({
        memberId: m.id,
        memberName: m.fullName,
        gym: m.tenant,
        membership: {
          startAt: m.membershipStartAt,
          endAt: m.membershipEndAt,
          paymentStatus: m.paymentStatus,
          isFrozen: m.isFrozen,
          planId: m.membershipPlanId,
          daysLeft: m.membershipEndAt
            ? Math.max(0, Math.ceil((m.membershipEndAt.getTime() - Date.now()) / 86400000))
            : null,
          isExpired: m.membershipEndAt ? m.membershipEndAt < new Date() : false,
        },
        attendanceThisMonth: m.attendances.length,
        lastCheckIn: m.attendances[0]?.checkInTime ?? null,
      })),
    };
  }
}
