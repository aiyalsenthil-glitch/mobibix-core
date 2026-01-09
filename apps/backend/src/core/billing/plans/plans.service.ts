import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BillingCycle } from '@prisma/client';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
@Injectable()
export class PlansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  /**
   * 🔒 Single source of truth for plan duration
   */
  private resolveDurationDays(
    name: string,
    billingCycle: BillingCycle,
  ): number {
    if (name === 'TRIAL') return 14;
    return billingCycle === BillingCycle.ANNUAL ? 365 : 30;
  }

  /**
   * Seed default plans (safe to run multiple times)
   */
  async ensureDefaultPlans() {
    const plans = [
      {
        name: 'BASIC',
        price: 99,
        level: 1,
        billingCycle: BillingCycle.MONTHLY,
        memberLimit: 0,
        features: {},
      },
      {
        name: 'PLUS',
        price: 199,
        level: 2,
        billingCycle: BillingCycle.MONTHLY,
        memberLimit: 0,
        features: {},
      },
      {
        name: 'PRO',
        price: 1999,
        level: 3,
        billingCycle: BillingCycle.ANNUAL,
        memberLimit: 0,
        features: {},
      },
      {
        name: 'ULTIMATE',
        price: 4999,
        level: 4,
        billingCycle: BillingCycle.ANNUAL,
        memberLimit: 0,
        features: {},
      },
    ];

    for (const plan of plans) {
      const exists = await this.prisma.plan.findFirst({
        where: { name: plan.name },
      });

      if (!exists) {
        await this.prisma.plan.create({
          data: {
            ...plan,
            durationDays: this.resolveDurationDays(
              plan.name,
              plan.billingCycle,
            ),
            isActive: true,
          },
        });
      }
    }
  }

  async getPlansWithUpgradeInfo(tenantId: string) {
    const currentSub =
      await this.subscriptionsService.getCurrentActiveSubscription(tenantId);

    const currentLevel = currentSub?.plan?.level ?? 0;

    const plans = await this.prisma.plan.findMany({
      where: {
        isActive: true,
        level: { gt: 0 }, // hide TRIAL
      },
      orderBy: { level: 'asc' },
    });

    return plans.map((plan) => ({
      ...plan,
      isCurrent: plan.level === currentLevel,
      canUpgrade: plan.level > currentLevel,
    }));
  }

  /**
   * Get all active plans
   */
  async getActivePlans() {
    return this.prisma.plan.findMany({
      where: {
        isActive: true,
        level: { gt: 0 }, // 👈 hide TRIAL from users
      },
      orderBy: { level: 'asc' },
    });
  }

  /**
   * Admin update plan (duration is AUTO controlled)
   */
  async updatePlan(
    planId: string,
    data: {
      price?: number;
      billingCycle?: BillingCycle;
      memberLimit?: number;
      isActive?: boolean;
    },
  ) {
    const existing = await this.prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!existing) {
      throw new Error('Plan not found');
    }

    const billingCycle = data.billingCycle ?? existing.billingCycle;

    const durationDays = this.resolveDurationDays(existing.name, billingCycle);

    return this.prisma.plan.update({
      where: { id: planId },
      data: {
        ...data,
        durationDays,
      },
    });
  }

  /**
   * Admin create plan
   */
  async createPlan(data: {
    name: string;
    level: number;
    price: number;
    billingCycle: BillingCycle;
    memberLimit: number;
  }) {
    const durationDays = this.resolveDurationDays(data.name, data.billingCycle);

    return this.prisma.plan.create({
      data: {
        ...data,
        durationDays,
        isActive: true,
        features: {},
      },
    });
  }
  /**   * Get all plans (active + inactive)
   */

  async getPlans() {
    return this.prisma.plan.findMany({
      orderBy: { level: 'asc' },
    });
  }

  /**
   * Trial plan (system only)
   */
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
        billingCycle: BillingCycle.MONTHLY,
        durationDays: 14,
        isActive: true,
        features: {},
      },
    });
  }
}
