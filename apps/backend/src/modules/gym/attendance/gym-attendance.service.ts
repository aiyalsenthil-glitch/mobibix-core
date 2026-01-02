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
  private normalizePhone(phone: string): string {
    return phone.replace(/\D/g, '').slice(-10);
  }
  /**
   * CHECK-IN
   */
  private getPaymentState(member: any) {
    const paid = member.paidAmount ?? 0;
    const fee = member.feeAmount ?? 0;

    if (paid <= 0) return 'DUE';
    if (paid < fee) return 'PARTIAL';
    return 'PAID';
  }

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

    const openAttendance = await this.prisma.gymAttendance.findFirst({
      where: {
        tenantId,
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

  // CHECK-IN OUT BY PHONE (QR)//
  async checkInOrOutByPhone(tenantId: string, phone: string) {
    const normalizedPhone = this.normalizePhone(phone);

    const member = await this.prisma.member.findFirst({
      where: { tenantId, phone: normalizedPhone },
    });

    if (!member) {
      throw new BadRequestException('MEMBER_NOT_FOUND');
    }

    if (isMembershipExpired(member.membershipEndAt)) {
      throw new ForbiddenException('MEMBERSHIP_EXPIRED');
    }
    const paymentState = this.getPaymentState(member);
    const dueAmount = member.feeAmount - member.paidAmount;

    if (paymentState === 'DUE') {
      throw new ForbiddenException('PAYMENT_REQUIRED');
    }

    // PARTIAL → allow with warning (frontend handles)
    // PAID → allow

    const openAttendance = await this.prisma.gymAttendance.findFirst({
      where: {
        tenantId,
        memberId: member.id,
        checkOutTime: null,
      },
    });

    // 🔁 TOGGLE LOGIC
    if (openAttendance) {
      return this.prisma.gymAttendance.update({
        where: { id: openAttendance.id },
        data: { checkOutTime: new Date() },
      });
    }

    await this.prisma.gymAttendance.create({
      data: {
        tenantId,
        memberId: member.id,
        checkInTime: new Date(),
        source: 'QR', // you already have this 👍
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
  //list currently checked-in members
  async listCurrentlyCheckedInMembers(tenantId: string) {
    return this.prisma.gymAttendance.findMany({
      where: {
        tenantId,
        checkOutTime: null,
      },
      include: {
        member: true,
      },
      orderBy: {
        checkInTime: 'desc',
      },
    });
  }

  //GET recent attendance for member
  async getRecentAttendanceForMember(
    tenantId: string,
    memberId: string,
    limit = 5,
  ) {
    return this.prisma.gymAttendance.findMany({
      where: {
        tenantId,
        memberId,
      },
      orderBy: {
        checkInTime: 'desc',
      },
      take: limit,
      select: {
        id: true,
        checkInTime: true,
        checkOutTime: true,
        source: true,
      },
    });
  }

  //count currently checked-in members
  async countCurrentlyCheckedInMembers(tenantId: string) {
    return this.prisma.gymAttendance.count({
      where: {
        tenantId,
        checkOutTime: null,
      },
    });
  }
}
