import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}

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
