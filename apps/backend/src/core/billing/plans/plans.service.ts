import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}
  async ensureDefaultPlans() {
    const plans = [
      {
        name: 'BASIC',
        price: 999,
        durationDays: 30,
        features: { maxMembers: 100 },
      },
      {
        name: 'PRO',
        price: 1999,
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

  async getOrCreateTrialPlan() {
    const existing = await this.prisma.plan.findFirst({
      where: { name: 'TRIAL' },
    });

    if (existing) return existing;

    return this.prisma.plan.create({
      data: {
        name: 'TRIAL',
        price: 0,
        durationDays: 14,
        isActive: true,
        features: {},
      },
    });
  }
}
