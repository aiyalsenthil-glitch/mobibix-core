import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BillingCycle, ModuleType } from '@prisma/client';
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

  private resolvePlanCode(name: string): string {
    return name.trim().toUpperCase().replace(/\s+/g, '_');
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
        memberLimit: 100,
        features: {},
      },
      {
        name: 'PLUS',
        price: 199,
        level: 2,
        billingCycle: BillingCycle.MONTHLY,
        memberLimit: 150,
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
            code: this.resolvePlanCode(plan.name),
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

  async getPlansWithUpgradeInfo(
    tenantId: string,
    module: ModuleType = 'MOBILE_SHOP',
  ) {
    const currentSub =
      await this.subscriptionsService.getCurrentActiveSubscription(
        tenantId,
        module,
      );

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
      throw new NotFoundException('Plan not found');
    }

    const billingCycle = data.billingCycle ?? existing.billingCycle;

    const durationDays = this.resolveDurationDays(existing.name, billingCycle);

    return this.prisma.plan.update({
      where: { id: planId },
      data: {
        price: data.price,
        billingCycle: data.billingCycle,
        memberLimit: data.memberLimit,
        isActive: data.isActive,
        durationDays,
      },
    });
  }

  /**
   * Admin create plan
   */
  async createPlan(data: {
    name: string;
    price: number;
    level?: number;
    billingCycle?: BillingCycle;
    memberLimit?: number;
    isActive?: boolean;
  }) {
    const normalizedName = data.name.trim();
    const code = this.resolvePlanCode(normalizedName);

    const existing = await this.prisma.plan.findFirst({
      where: {
        OR: [{ name: normalizedName }, { code }],
      },
    });

    if (existing) {
      throw new ConflictException(
        `Plan with name "${normalizedName}" already exists`,
      );
    }

    const billingCycle = data.billingCycle ?? BillingCycle.MONTHLY;
    const durationDays = this.resolveDurationDays(normalizedName, billingCycle);

    let level = data.level;
    if (level === undefined) {
      const maxLevel = await this.prisma.plan.findFirst({
        orderBy: { level: 'desc' },
        select: { level: true },
      });
      level = (maxLevel?.level ?? -1) + 1;
    }

    return this.prisma.plan.create({
      data: {
        name: normalizedName,
        code,
        level,
        price: data.price,
        billingCycle,
        memberLimit: data.memberLimit ?? 0,
        durationDays,
        isActive: data.isActive ?? true,
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
        code: this.resolvePlanCode('TRIAL'),
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
