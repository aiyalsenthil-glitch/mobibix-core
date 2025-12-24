import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';

@Injectable()
export class GymMembershipService {
  constructor(private readonly prisma: PrismaService) {}

  async createMembership(
    tenantId: string,
    memberId: string,
    durationDays: number,
  ) {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + durationDays);

    return this.prisma.gymMembership.create({
      data: {
        tenantId,
        memberId,
        startDate,
        endDate,
        status: 'ACTIVE',
      },
    });
  }

  async getLatestMembership(tenantId: string, memberId: string) {
    return this.prisma.gymMembership.findFirst({
      where: {
        tenantId,
        memberId,
      },
      orderBy: { startDate: 'desc' },
    });
  }

  async countActiveMembers(tenantId: string) {
    const today = new Date();
    return this.prisma.gymMembership.count({
      where: {
        tenantId,
        startDate: { lte: today },
        endDate: { gte: today },
        status: 'ACTIVE',
      },
    });
  }

  async countExpiredMembers(tenantId: string) {
    const today = new Date();
    return this.prisma.gymMembership.count({
      where: {
        tenantId,
        endDate: { lt: today },
      },
    });
  }

  // ✅ FIXED: tenantId added
  async countExpiringSoon(tenantId: string, days: number = 3) {
    const today = new Date();
    const future = new Date();
    future.setDate(today.getDate() + days);

    return this.prisma.gymMembership.count({
      where: {
        tenantId,
        startDate: { lte: today },
        endDate: { gte: today, lte: future },
        status: 'ACTIVE',
      },
    });
  }

  // ✅ FIXED: tenantId added
  async listExpiringSoon(tenantId: string, days: number = 3) {
    const today = new Date();
    const future = new Date();
    future.setDate(today.getDate() + days);

    return this.prisma.gymMembership.findMany({
      where: {
        tenantId,
        startDate: { lte: today },
        endDate: { gte: today, lte: future },
        status: 'ACTIVE',
      },
      orderBy: { endDate: 'asc' },
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

  // ✅ FINAL API used by Android
  async getExpiringMemberships(tenantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiringBefore = new Date();
    expiringBefore.setDate(today.getDate() + 3);
    expiringBefore.setHours(23, 59, 59, 999);

    const memberships = await this.prisma.gymMembership.findMany({
      where: {
        tenantId,
        status: 'ACTIVE',
        endDate: {
          gte: today,
          lte: expiringBefore,
        },
      },
      include: {
        member: {
          select: { fullName: true },
        },
      },
      orderBy: { endDate: 'asc' },
    });

    return {
      items: memberships.map((m) => ({
        id: m.id,
        memberName: m.member.fullName,
        startDate: m.startDate,
        endDate: m.endDate,
        status: m.status,
      })),
    };
  }
}
