import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscriptionStatus } from '@prisma/client';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async assignTrialSubscription(tenantId: string, planId: string) {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 14);

    return this.prisma.tenantSubscription.create({
      data: {
        tenantId,
        planId,
        status: SubscriptionStatus.TRIAL,
        startDate,
        endDate,
      },
    });
  }

  async getSubscriptionByTenant(tenantId: string) {
    return this.prisma.tenantSubscription.findUnique({
      where: { tenantId },
      include: {
        plan: true,
      },
    });
  }
  async extendTrial(tenantId: string, extraDays: number) {
    const sub = await this.getSubscriptionByTenant(tenantId);
    if (!sub) return null;

    const newEndDate = new Date(sub.endDate);
    newEndDate.setDate(newEndDate.getDate() + extraDays);

    return this.prisma.tenantSubscription.update({
      where: { tenantId },
      data: {
        endDate: newEndDate,
        status: 'TRIAL',
      },
    });
  }

  async changeStatus(
    tenantId: string,
    status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED',
  ) {
    return this.prisma.tenantSubscription.update({
      where: { tenantId },
      data: { status },
    });
  }
}
