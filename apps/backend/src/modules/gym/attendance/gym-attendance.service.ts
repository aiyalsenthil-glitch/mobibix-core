import {
  Injectable,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { isMembershipExpired } from '../../../common/utils/membership.util';

@Injectable()
export class GymAttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * CHECK-IN
   */
  async checkIn(
    tenantId: string,
    memberId: string,
    source: 'MANUAL' | 'QR' | 'BIOMETRIC' = 'MANUAL',
  ) {
    const member = await this.prisma.member.findFirst({
      where: {
        id: memberId,
        tenantId,
      },
    });
    if (!member) {
      throw new BadRequestException('Member not found');
    }

    if (isMembershipExpired(member.membershipEndAt)) {
      throw new ForbiddenException('Membership expired');
    }

    const now = new Date();

    const activeMembership = await this.prisma.gymMembership.findFirst({
      where: {
        tenantId,
        memberId,
        status: 'ACTIVE',
        startDate: { lte: now },
        endDate: { gte: now },
      },
      orderBy: { startDate: 'desc' },
    });

    if (!activeMembership) {
      throw new ForbiddenException('Member does not have an active membership');
    }

    const openAttendance = await this.prisma.gymAttendance.findFirst({
      where: {
        memberId,
        checkOutTime: null,
      },
    });

    if (openAttendance) {
      throw new BadRequestException('Member already checked in');
    }

    return this.prisma.gymAttendance.create({
      data: {
        tenantId,
        memberId,
        checkInTime: now,
        source,
      },
    });
  }

  /**
   * CHECK-OUT
   */
  async checkOut(tenantId: string, memberId: string) {
    const openAttendance = await this.prisma.gymAttendance.findFirst({
      where: { tenantId, memberId, checkOutTime: null },
      orderBy: { checkInTime: 'desc' },
    });

    if (!openAttendance) {
      throw new BadRequestException('No active attendance found');
    }

    return this.prisma.gymAttendance.update({
      where: { id: openAttendance.id },
      data: {
        checkOutTime: new Date(),
      },
    });
  }
  async listTodayAttendance(tenantId: string) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date();
    end.setHours(23, 59, 59, 999);

    return this.prisma.gymAttendance.findMany({
      where: {
        tenantId,
        checkInTime: {
          gte: start,
          lte: end,
        },
      },
      orderBy: {
        checkInTime: 'desc',
      },
      include: {
        member: {
          select: {
            id: true,
            fullName: true,
            phone: true,
          },
        },
      },
    });
  }

  /**
   * TODAY ATTENDANCE COUNT
   * ✅ tenant is resolved by Prisma tenant context
   */
  async countTodayAttendance(tenantId: string) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date();
    end.setHours(23, 59, 59, 999);

    return this.prisma.gymAttendance.count({
      where: {
        tenantId,
        checkInTime: {
          gte: start,
          lte: end,
        },
      },
    });
  }

  async getTodayAttendance(tenantId: string) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    return {
      items: await this.prisma.gymAttendance
        .findMany({
          where: {
            tenantId,
            checkInTime: {
              gte: startOfDay,
            },
          },
          include: {
            member: {
              select: {
                fullName: true,
              },
            },
          },
          orderBy: {
            checkInTime: 'desc',
          },
        })
        .then((rows) =>
          rows.map((r) => ({
            id: r.id,
            memberName: r.member.fullName,
            checkInTime: r.checkInTime,
            checkOutTime: r.checkOutTime,
          })),
        ),
    };
  }
}
