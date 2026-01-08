import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscriptionStatus } from '@prisma/client';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}
  async upgradeSubscription(tenantId: string, planId: string) {
    const newPlan = await this.prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!newPlan || newPlan.level === null) {
      throw new NotFoundException('Invalid plan');
    }

    const currentSub = await this.getCurrentActiveSubscription(tenantId);

    if (!currentSub || currentSub.plan.level === null) {
      throw new NotFoundException('Active subscription not found');
    }

    // 🔥 UPGRADE-ONLY RULE (NOW TYPE-SAFE)
    if (newPlan.level <= currentSub.plan.level) {
      throw new BadRequestException(
        'Cannot downgrade or reselect the same plan',
      );
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + newPlan.durationDays);

    return this.prisma.tenantSubscription.update({
      where: { tenantId },
      data: {
        planId: newPlan.id,
        status: 'ACTIVE',
        startDate,
        endDate,
        expiryReminderSentAt: null, // 👈 reset for new cycle
      },
    });
  }

  async canAddMember(tenantId: string): Promise<boolean> {
    const subscription = await this.getCurrentActiveSubscription(tenantId);
    if (!subscription) return false;

    const plan = subscription.plan;
    const features = plan.features as any;

    if (!features?.memberLimit) return true;

    const memberCount = await this.prisma.member.count({
      where: { tenantId },
    });

    return memberCount < features.memberLimit;
  }

  async getCurrentActiveSubscription(tenantId: string) {
    // Accept both ACTIVE and TRIAL subscriptions as "current" so trial tenants
    // can use features during their trial window.
    return this.prisma.tenantSubscription.findFirst({
      where: {
        tenantId,
        status: { in: ['ACTIVE', 'TRIAL'] },
        startDate: {
          lte: new Date(),
        },
        endDate: {
          gt: new Date(),
        },
      },
      orderBy: {
        startDate: 'desc',
      },
      include: {
        plan: true,
      },
    });
  }

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
  async changePlan(tenantId: string, planName: string) {
    // 1️⃣ Find plan
    const plan = await this.prisma.plan.findFirst({
      where: {
        name: planName,
        isActive: true,
      },
    });

    if (!plan) {
      throw new BadRequestException('Invalid or inactive plan');
    }

    // 2️⃣ Calculate new dates
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + plan.durationDays);

    // 3️⃣ Update subscription
    return this.prisma.tenantSubscription.update({
      where: { tenantId },
      data: {
        planId: plan.id,
        status: 'ACTIVE',
        startDate,
        endDate,
      },
    });
  }

  async getActiveSubscriptionByTenant(tenantId: string) {
    return this.prisma.tenantSubscription.findFirst({
      where: {
        tenantId,
        status: 'ACTIVE',
      },
      include: {
        plan: true,
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
