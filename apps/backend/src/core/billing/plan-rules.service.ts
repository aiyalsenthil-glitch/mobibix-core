import { Injectable } from '@nestjs/common';
import { ModuleType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppFeature } from './whatsapp-rules';

export type PlanRules = {
  planId: string;
  code: string;
  name: string;
  enabled: boolean;
  maxMembers: number | null; // null = unlimited
  maxStaff: number | null; // null = unlimited
  whatsapp?: {
    utility: number;
    marketing: number;
    isDaily?: boolean;
  };
  analyticsHistoryDays: number;
  features: WhatsAppFeature[];
};

@Injectable()
export class PlanRulesService {
  private readonly cache = new Map<
    string,
    { value: PlanRules; expiresAt: number }
  >();
  private readonly ttlMs = 5 * 60 * 1000;

  constructor(private readonly prisma: PrismaService) {}

  async getPlanRulesByCode(code: string): Promise<PlanRules | null> {
    const normalized = code.toUpperCase();
    const cached = this.cache.get(normalized);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const plan = await this.prisma.plan.findFirst({
      where: {
        OR: [{ code: normalized }, { name: normalized }],
      },
      include: { planFeatures: true },
    });

    if (!plan) {
      return null;
    }

    const normalizedCode = (plan.code ?? plan.name).toUpperCase();

    // Read limits from database (Task 1)
    const rules: PlanRules = {
      planId: plan.id,
      code: normalizedCode,
      name: plan.name,
      enabled: plan.isActive,
      maxMembers: plan.maxMembers, // null = unlimited
      maxStaff: plan.maxStaff, // null = unlimited
      whatsapp: {
        utility: plan.whatsappUtilityQuota,
        marketing: plan.whatsappMarketingQuota,
        isDaily: false, // Monthly quotas
      },
      analyticsHistoryDays: plan.analyticsHistoryDays,
      features: plan.planFeatures
        .filter((feature) => feature.enabled)
        .map((feature) => feature.feature as WhatsAppFeature),
    };

    this.cache.set(normalized, {
      value: rules,
      expiresAt: Date.now() + this.ttlMs,
    });

    return rules;
  }

  async getPlanRulesForTenant(
    tenantId: string,
    module?: ModuleType,
  ): Promise<PlanRules | null> {
    // 1. Fetch Active Subscription (filtered by module if provided)
    const subscription = await this.prisma.tenantSubscription.findFirst({
      where: {
        tenantId,
        status: { in: ['ACTIVE', 'TRIAL'] },
        ...(module && { module }), // Filter by module if provided
      },
      orderBy: { startDate: 'desc' },
      include: {
        plan: {
          include: { planFeatures: true },
        },
        addons: {
          where: { status: 'ACTIVE' },
          include: {
            addonPlan: {
              include: { planFeatures: true },
            },
          },
        },
      },
    });

    if (!subscription?.plan) {
      return null;
    }

    // 2. Get base plan rules
    const basePlan = subscription.plan;
    const baseRules: PlanRules = {
      planId: basePlan.id,
      code: basePlan.code,
      name: basePlan.name,
      enabled: basePlan.isActive,
      maxMembers: basePlan.maxMembers,
      maxStaff: basePlan.maxStaff,
      whatsapp: {
        utility: basePlan.whatsappUtilityQuota,
        marketing: basePlan.whatsappMarketingQuota,
        isDaily: false,
      },
      analyticsHistoryDays: basePlan.analyticsHistoryDays,
      features: basePlan.planFeatures
        .filter((f) => f.enabled)
        .map((f) => f.feature as WhatsAppFeature),
    };

    // 3. Merge add-on features and quotas (Task 3)
    if (subscription.addons && subscription.addons.length > 0) {
      const addonFeatures = new Set(baseRules.features);
      let totalUtilityQuota = baseRules.whatsapp?.utility || 0;
      let totalMarketingQuota = baseRules.whatsapp?.marketing || 0;

      for (const addon of subscription.addons) {
        // Merge features
        addon.addonPlan.planFeatures
          .filter((f) => f.enabled)
          .forEach((f) => addonFeatures.add(f.feature as WhatsAppFeature));

        // Add quotas
        totalUtilityQuota += addon.addonPlan.whatsappUtilityQuota;
        totalMarketingQuota += addon.addonPlan.whatsappMarketingQuota;
      }

      baseRules.features = Array.from(addonFeatures);
      if (baseRules.whatsapp) {
        baseRules.whatsapp.utility = totalUtilityQuota;
        baseRules.whatsapp.marketing = totalMarketingQuota;
      }
    }

    return baseRules;
  }

  async isFeatureEnabledForTenant(
    tenantId: string,
    feature: WhatsAppFeature,
    module?: ModuleType,
  ): Promise<boolean> {
    const rules = await this.getPlanRulesForTenant(tenantId, module);
    if (!rules?.enabled) {
      return false;
    }

    return rules.features.includes(feature);
  }

  invalidateByCode(code: string) {
    this.cache.delete(code.toUpperCase());
  }

  invalidateByPlanId(planId: string) {
    for (const [key, cached] of this.cache.entries()) {
      if (cached.value.planId === planId) {
        this.cache.delete(key);
      }
    }
  }
}
