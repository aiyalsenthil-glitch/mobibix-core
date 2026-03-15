import { Injectable, ForbiddenException } from '@nestjs/common';
import { ModuleType, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppFeature } from './whatsapp-rules';

export type PlanRules = {
  planId: string;
  code: string;
  name: string;
  enabled: boolean;
  maxMembers: number | null; // null = unlimited
  maxStaff: number | null; // null = unlimited
  maxShops: number | null; // null = unlimited
  whatsapp?: {
    messageQuota: number;
    utilityQuota?: number;
    marketingQuota?: number;
    isDaily?: boolean;
    maxNumbers?: number;
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
      maxShops: plan.maxShops, // null = unlimited
      whatsapp: {
        messageQuota:
          (plan.whatsappUtilityQuota || 0) + (plan.whatsappMarketingQuota || 0),
        isDaily: false, // Monthly quotas
        maxNumbers: 1, // Default to 1 (add DB field later if needed)
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

  /**
   * 🔥 CRITICAL FIX: Get plan rules for tenant's SPECIFIC MODULE subscription
   * Module parameter is now REQUIRED to prevent cross-module rule aggregation
   */
  async getPlanRulesForTenant(
    tenantId: string,
    module: ModuleType,
  ): Promise<PlanRules | null> {
    // Check cache first by tenantId + module
    const cacheKey = `tenant_${tenantId}_${module}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    // 1️⃣ Fetch all active/trial/past_due subscriptions for this specific module
    const subscriptions = await this.prisma.tenantSubscription.findMany({
      where: {
        tenantId,
        module,
        status: {
          in: [
            SubscriptionStatus.ACTIVE,
            SubscriptionStatus.TRIAL,
            SubscriptionStatus.PAST_DUE,
          ],
        },
        // Ensure we don't pick up ancient expired ACTIVE subs
        OR: [
          { status: SubscriptionStatus.TRIAL, endDate: { gt: new Date() } },
          {
            status: {
              in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE],
            },
          },
        ],
      },
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
      orderBy: [
        { status: 'asc' }, // ACTIVE comes before TRIAL alphabetically
        { startDate: 'desc' }, // Latest first
      ],
    });

    if (!subscriptions || subscriptions.length === 0) {
      return null;
    }

    // 2️⃣ Identify the PRIMARY subscription (First ACTIVE, otherwise First TRIAL)
    // Ordered by status asc so ACTIVE (A) is before TRIAL (T)
    const primarySub = subscriptions[0];
    const plan = primarySub.plan;

    if (!plan) return null;

    // 3️⃣ Initialize rules from the Primary Plan (NO MORE "AGGREGATED" FAKES)
    const resultRules: PlanRules = {
      planId: plan.id,
      code: plan.code || plan.name.toUpperCase(),
      name: plan.name,
      enabled: plan.isActive,
      maxMembers: plan.maxMembers,
      maxStaff: plan.maxStaff,
      maxShops: plan.maxShops,
      whatsapp: {
        messageQuota:
          (plan.whatsappUtilityQuota || 0) + (plan.whatsappMarketingQuota || 0),
        utilityQuota: plan.whatsappUtilityQuota || 0,
        marketingQuota: plan.whatsappMarketingQuota || 0,
        isDaily: plan.code === 'TRIAL' || plan.code === 'MOBIBIX_TRIAL', // Trial usually has daily quotas
        maxNumbers: 1,
      },
      analyticsHistoryDays: plan.analyticsHistoryDays,
      features: plan.planFeatures
        .filter((f) => f.enabled)
        .map((f) => f.feature as WhatsAppFeature),
    };

    const featuresSet = new Set<WhatsAppFeature>(resultRules.features);

    // 4️⃣ Overlay Add-ons from ALL subscriptions of this module
    // (In practice, add-ons usually attach to the primary sub, but we support module-wide)
    for (const sub of subscriptions) {
      if (sub.addons && sub.addons.length > 0) {
        for (const addon of sub.addons) {
          const addonPlan = addon.addonPlan;

          // Add Quotas (Additive)
          if (resultRules.whatsapp) {
            const util = addonPlan.whatsappUtilityQuota || 0;
            const mark = addonPlan.whatsappMarketingQuota || 0;
            resultRules.whatsapp.utilityQuota =
              (resultRules.whatsapp.utilityQuota || 0) + util;
            resultRules.whatsapp.marketingQuota =
              (resultRules.whatsapp.marketingQuota || 0) + mark;
            resultRules.whatsapp.messageQuota += util + mark;
          }

          // Merge Features (Unique)
          addonPlan.planFeatures
            .filter((f) => f.enabled)
            .forEach((f) => featuresSet.add(f.feature as WhatsAppFeature));
        }
      }
    }

    resultRules.features = Array.from(featuresSet);

    // 5️⃣ Cache the result before returning
    this.cache.set(cacheKey, {
      value: resultRules,
      expiresAt: Date.now() + this.ttlMs,
    });

    return resultRules;
  }

  async isFeatureEnabledForTenant(
    tenantId: string,
    feature: WhatsAppFeature,
    module: ModuleType, // 🔥 NOW REQUIRED
  ): Promise<boolean> {
    const rules = await this.getPlanRulesForTenant(tenantId, module);
    if (!rules?.enabled) {
      return false;
    }

    return rules.features.includes(feature);
  }

  async checkRuntimeLimits(
    tenantId: string,
    module: ModuleType,
  ): Promise<void> {
    const rules = await this.getPlanRulesForTenant(tenantId, module);
    if (!rules) return;

    // 1. Check Members (GYM Only)
    if (module === ModuleType.GYM && rules.maxMembers !== null) {
      const memberCount = await this.prisma.member.count({
        where: { tenantId },
      });
      if (memberCount > rules.maxMembers) {
        throw new ForbiddenException(
          `PLAN_LIMIT_EXCEEDED: You have ${memberCount} members, but the ${rules.name} plan only allows ${rules.maxMembers}. Please upgrade or remove members first.`,
        );
      }
    }

    // 2. Check Staff (All Modules)
    if (rules.maxStaff !== null) {
      const staffCount = await this.prisma.userTenant.count({
        where: { tenantId, deletedAt: null },
      });
      if (staffCount > rules.maxStaff) {
        throw new ForbiddenException(
          `PLAN_LIMIT_EXCEEDED: You have ${staffCount} staff members, but the ${rules.name} plan only allows ${rules.maxStaff}. Please upgrade or deactivate staff first.`,
        );
      }
    }

    // 3. Check Shops (Mobile Shop / Business)
    if (rules.maxShops !== null) {
      const shopCount = await this.prisma.shop.count({
        where: { tenantId, isActive: true },
      });
      if (shopCount > rules.maxShops) {
        throw new ForbiddenException(
          `PLAN_LIMIT_EXCEEDED: You have ${shopCount} active shops, but the ${rules.name} plan only allows ${rules.maxShops}. Please upgrade or deactivate shops first.`,
        );
      }
    }
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
