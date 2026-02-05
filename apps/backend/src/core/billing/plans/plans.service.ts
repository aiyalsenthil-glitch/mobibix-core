import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ModuleType } from '@prisma/client';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

@Injectable()
export class PlansService {
  private readonly logger = new Logger(PlansService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  private resolvePlanCode(name: string): string {
    return name.trim().toUpperCase().replace(/\s+/g, '_');
  }



  async getPlansWithUpgradeInfo(tenantId: string, module: ModuleType) {
    const currentSub =
      await this.subscriptionsService.getCurrentActiveSubscription(
        tenantId,
        module,
      );

    const currentLevel = currentSub?.plan?.level ?? 0;

    // Filter by module AND isPublic=true
    const plans = await this.prisma.plan.findMany({
      where: {
        isActive: true,
        isPublic: true, // Only show public plans
        level: { gt: 0 }, // hide TRIAL
        module, // Filter by exact module
      },
      include: {
        planPrices: {
          where: { isActive: true },
          select: { billingCycle: true, price: true },
        },
        planFeatures: {
          select: { feature: true },
        },
      },
      orderBy: { level: 'asc' },
    });

    return plans.map((plan) => ({
      ...plan,
      prices: plan.planPrices,
      features: plan.planFeatures.map((f) => f.feature),
      isCurrent: plan.level === currentLevel,
      canUpgrade: plan.level > currentLevel,
    }));
  }

  /**
   * Get all active public plans
   */
  async getActivePlans() {
    return this.prisma.plan.findMany({
      where: {
        isActive: true,
        isPublic: true, // Only show public plans
        level: { gt: 0 }, // 👈 hide TRIAL from users
      },
      orderBy: { level: 'asc' },
    });
  }

  /**
   * Admin update plan (identity + module + tier only)
   */
  async updatePlan(
    planId: string,
    data: {
      name?: string;
      level?: number;
      module?: ModuleType;
      isActive?: boolean;
      isPublic?: boolean;
      isAddon?: boolean;
    },
  ) {
    const existing = await this.prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!existing) {
      throw new NotFoundException('Plan not found');
    }

    return this.prisma.plan.update({
      where: { id: planId },
      data: {
        name: data.name?.trim(),
        level: data.level,
        module: data.module,
        isActive: data.isActive,
        isPublic: data.isPublic,
        isAddon: data.isAddon,
      },
    });
  }

  /**
   * Admin create plan
   */
  async createPlan(data: {
    name: string;
    code?: string;
    level?: number;
    module: ModuleType;
    isActive?: boolean;
    isPublic?: boolean;
    isAddon?: boolean;
  }) {
    const normalizedName = data.name.trim();
    const normalizedCode = data.code
      ? data.code.trim().toUpperCase()
      : this.resolvePlanCode(normalizedName);

    const existing = await this.prisma.plan.findFirst({
      where: {
        OR: [{ name: normalizedName }, { code: normalizedCode }],
      },
    });

    if (existing) {
      throw new ConflictException(
        `Plan with name "${normalizedName}" already exists`,
      );
    }

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
        code: normalizedCode,
        level,
        module: data.module,
        isActive: data.isActive ?? true,
        isPublic: data.isPublic ?? true,
        isAddon: data.isAddon ?? false,
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
  async getOrCreateTrialPlan(module: ModuleType) {
    const isMobileShop = module === ModuleType.MOBILE_SHOP;
    const code = isMobileShop ? 'MOBIBIX_TRIAL' : 'GYM_TRIAL';
    const name = isMobileShop ? 'MobiBix Trial' : 'Gym Trial';

    const existing = await this.prisma.plan.findFirst({
      where: { code },
    });

    if (existing) return existing;

    return this.prisma.plan.create({
      data: {
        code,
        name,
        level: 0,
        module: isMobileShop ? ModuleType.MOBILE_SHOP : ModuleType.GYM,
        isActive: true,
        isPublic: false,
        isAddon: false,
      },
    });
  }
}
