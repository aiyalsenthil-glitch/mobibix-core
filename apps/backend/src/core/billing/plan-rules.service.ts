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
  maxShops: number | null; // null = unlimited
  whatsapp?: {
    messageQuota: number;
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
        messageQuota: (plan.whatsappUtilityQuota || 0) + (plan.whatsappMarketingQuota || 0),
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

  async getPlanRulesForTenant(
    tenantId: string,
    module?: ModuleType,
  ): Promise<PlanRules | null> {
    // 1. Fetch ALL Active Subscriptions
    const subscriptions = await this.prisma.tenantSubscription.findMany({
      where: {
        tenantId,
        status: { in: ['ACTIVE', 'TRIAL'] },
        // If module is specified, we STILL need to check if there are add-on subscriptions
        // But for now, let's aggregate EVERYTHING to be safe, or filter if strict
        // proper behavior: If module is GYM, we want GYM features + global add-ons
        // If module is WHATSAPP, we want WHATSAPP features
        // BUT: WhatsApp features might be accessed from a generic context.
        // SAFE BET: Aggregate all active subscriptions for the tenant.
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
    });

    if (!subscriptions || subscriptions.length === 0) {
      return null;
    }

    // 2. Initialize aggregated rules with defaults
    const aggregatedRules: PlanRules = {
      planId: 'aggregated',
      code: 'AGGREGATED',
      name: 'Combined Subscription',
      enabled: true,
      maxMembers: 0,
      maxStaff: 0,
      maxShops: 0,
      whatsapp: {
        messageQuota: 0,
        isDaily: false,
        maxNumbers: 0,
      },
      analyticsHistoryDays: 0,
      features: [],
    };

    const featuresSet = new Set<WhatsAppFeature>();

    // 3. Iterate and Merge
    for (const sub of subscriptions) {
      if (!sub.plan) continue;

      const plan = sub.plan;

      // Merge Limits (Take MAX for non-additive, SUM for quotas)
      if (plan.maxMembers === null) aggregatedRules.maxMembers = null; // Unlim wins
      else if (aggregatedRules.maxMembers !== null) aggregatedRules.maxMembers = Math.max(aggregatedRules.maxMembers, plan.maxMembers);

      if (plan.maxStaff === null) aggregatedRules.maxStaff = null;
      else if (aggregatedRules.maxStaff !== null) aggregatedRules.maxStaff = Math.max(aggregatedRules.maxStaff, plan.maxStaff);

      if (plan.maxShops === null) aggregatedRules.maxShops = null;
      else if (aggregatedRules.maxShops !== null) aggregatedRules.maxShops = Math.max(aggregatedRules.maxShops, plan.maxShops ?? 0);

      aggregatedRules.analyticsHistoryDays = Math.max(aggregatedRules.analyticsHistoryDays, plan.analyticsHistoryDays);

      // Add WhatsApp Quotas (Additive)
      if (aggregatedRules.whatsapp) {
        aggregatedRules.whatsapp.messageQuota += (plan.whatsappUtilityQuota || 0) + (plan.whatsappMarketingQuota || 0);
        // Default to 1 if not defined in plan (assumed 1 per plan generally)
        aggregatedRules.whatsapp.maxNumbers = Math.max(aggregatedRules.whatsapp.maxNumbers ?? 0, 1); 
      }

      // Merge features
      plan.planFeatures
        .filter((f) => f.enabled)
        .forEach((f) => featuresSet.add(f.feature as WhatsAppFeature));

      // Merge Add-ons within this subscription
      if (sub.addons) {
        for (const addon of sub.addons) {
          if (aggregatedRules.whatsapp) {
            aggregatedRules.whatsapp.messageQuota += (addon.addonPlan.whatsappUtilityQuota || 0) + (addon.addonPlan.whatsappMarketingQuota || 0);
          }
          addon.addonPlan.planFeatures
            .filter((f) => f.enabled)
            .forEach((f) => featuresSet.add(f.feature as WhatsAppFeature));
        }
      }
    }

    aggregatedRules.features = Array.from(featuresSet);

    // If a specific module was requested, we might want to ensure that module is actually present
    // but typically feature checks are "does tenant have X feature", regardless of which sub provided it.
    
    return aggregatedRules;
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
