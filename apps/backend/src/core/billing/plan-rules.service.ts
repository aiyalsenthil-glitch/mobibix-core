import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppFeature } from './whatsapp-rules';

export type PlanRules = {
  planId: string;
  code: string;
  name: string;
  enabled: boolean;
  maxMembers: number;
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
      where: { code: normalized },
      include: { planFeatures: true },
    });

    if (!plan) {
      return null;
    }

    const rules: PlanRules = {
      planId: plan.id,
      code: plan.code ?? plan.name,
      name: plan.name,
      enabled: plan.isActive,
      maxMembers: plan.maxMembers ?? plan.memberLimit ?? 0,
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

  async getPlanRulesForTenant(tenantId: string): Promise<PlanRules | null> {
    const subscription = await this.prisma.tenantSubscription.findFirst({
      where: {
        tenantId,
        status: { in: ['ACTIVE', 'TRIAL'] },
      },
      orderBy: { startDate: 'desc' },
      include: { plan: true },
    });

    if (!subscription?.plan) {
      return null;
    }

    const code = subscription.plan.code || subscription.plan.name;
    return this.getPlanRulesByCode(code);
  }

  async isFeatureEnabledForTenant(
    tenantId: string,
    feature: WhatsAppFeature,
  ): Promise<boolean> {
    const rules = await this.getPlanRulesForTenant(tenantId);
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
