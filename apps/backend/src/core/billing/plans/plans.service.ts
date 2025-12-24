import { Injectable, LOG_LEVELS } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}
  async ensureDefaultPlans() {
    const plans = [
      {
        name: 'BASIC',
        price: 999,
        level: 1,
        durationDays: 30,
        features: { maxMembers: null },
      },
      {
        name: 'PRO',
        price: 1999,
        level: 2,
        durationDays: 365,
        features: { maxMembers: null },
      },
    ];

    for (const plan of plans) {
      const exists = await this.prisma.plan.findFirst({
        where: { name: plan.name },
      });

      if (!exists) {
        await this.prisma.plan.create({
          data: plan,
        });
      }
    }
  }
  async getActivePlans() {
    return this.prisma.plan.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        level: 'asc',
      },
    });
  }
  async updatePlan(
    planId: string,
    data: {
      price?: number;
      durationDays?: number;
      memberLimit?: number;
      isActive?: boolean;
    },
  ) {
    return this.prisma.plan.update({
      where: { id: planId },
      data,
    });
  }
  async createPlan(data: {
    name: string;
    level: number;
    price: number;
    durationDays: number;
    memberLimit: number;
  }) {
    return this.prisma.plan.create({
      data: {
        ...data,
        isActive: true,
        features: {},
      },
    });
  }

  async getOrCreateTrialPlan() {
    const existing = await this.prisma.plan.findFirst({
      where: { name: 'TRIAL' },
    });

    if (existing) return existing;

    return this.prisma.plan.create({
      data: {
        name: 'TRIAL',
        price: 0,
        level: 0,
        durationDays: 14,
        isActive: true,
        features: {},
      },
    });
  }
}
