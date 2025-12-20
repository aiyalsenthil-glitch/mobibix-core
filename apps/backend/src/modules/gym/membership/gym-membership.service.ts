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

  async getLatestMembership(memberId: string) {
    return this.prisma.gymMembership.findFirst({
      where: { memberId },
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
  async countExpiringSoon(days: number = 3) {
    const today = new Date();
    const future = new Date();
    future.setDate(today.getDate() + days);

    return this.prisma.gymMembership.count({
      where: {
        startDate: { lte: today },
        endDate: { gte: today, lte: future },
        status: 'ACTIVE',
      },
    });
  }

  async listExpiringSoon(days: number = 3) {
    const today = new Date();
    const future = new Date();
    future.setDate(today.getDate() + days);

    return this.prisma.gymMembership.findMany({
      where: {
        startDate: { lte: today },
        endDate: { gte: today, lte: future },
        status: 'ACTIVE',
      },
      orderBy: { endDate: 'asc' },
      include: {
        member: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    });
  }
}
