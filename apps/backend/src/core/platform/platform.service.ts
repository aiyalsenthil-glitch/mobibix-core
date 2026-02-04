import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppFeature } from '../billing/whatsapp-rules';
import { PlanRulesService } from '../billing/plan-rules.service';

@Injectable()
export class PlatformService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly planRulesService: PlanRulesService,
  ) {}

  /**
   * List all plans with their features
   */
  async listAllPlans() {
    const plans = await this.prisma.plan.findMany({
      include: {
        planFeatures: true,
        _count: {
          select: {
            subscriptions: true,
          },
        },
      },
      orderBy: { level: 'asc' },
    });

    return plans.map((plan) => ({
      id: plan.id,
      code: plan.code,
      name: plan.name,
      level: plan.level,
      module: plan.module,
      isActive: plan.isActive,
      isPublic: plan.isPublic,
      isAddon: plan.isAddon,
      features: plan.planFeatures.map((pf) => ({
        feature: pf.feature,
        enabled: pf.enabled,
      })),
      tenantsUsing: plan._count.subscriptions,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    }));
  }

  /**
   * Get single plan with features
   */
  async getPlanWithFeatures(planId: string) {
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
      include: {
        planFeatures: true,
        subscriptions: {
          where: {
            status: { in: ['ACTIVE', 'TRIAL'] },
          },
          include: {
            tenant: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    return {
      ...plan,
      features: plan.planFeatures.map((pf) => ({
        id: pf.id,
        feature: pf.feature,
        enabled: pf.enabled,
      })),
      activeTenants: plan.subscriptions.map((sub) => ({
        tenantId: sub.tenantId,
        tenantName: sub.tenant.name,
        status: sub.status,
      })),
    };
  }

  /**
   * Update plan properties
   */
  async updatePlan(
    planId: string,
    data: { isActive?: boolean; isPublic?: boolean },
  ) {
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    const updated = await this.prisma.plan.update({
      where: { id: planId },
      data: {
        isActive: data.isActive,
        isPublic: data.isPublic,
        updatedAt: new Date(),
      },
      include: {
        planFeatures: true,
      },
    });

    // Invalidate cache
    this.planRulesService.invalidateByPlanId(planId);

    return updated;
  }

  /**
   * Update plan features (bulk update)
   */
  async updatePlanFeatures(
    planId: string,
    features: Array<{ feature: WhatsAppFeature; enabled: boolean }>,
  ) {
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    // Use transaction to update all features atomically
    await this.prisma.$transaction(
      features.map((item) =>
        this.prisma.planFeature.upsert({
          where: {
            planId_feature: {
              planId,
              feature: item.feature,
            },
          },
          create: {
            planId,
            feature: item.feature,
            enabled: item.enabled,
          },
          update: {
            enabled: item.enabled,
          },
        }),
      ),
    );

    // Invalidate cache
    this.planRulesService.invalidateByPlanId(planId);

    return this.getPlanWithFeatures(planId);
  }

  /**
   * Add single feature to plan
   */
  async addFeatureToPlan(
    planId: string,
    feature: WhatsAppFeature,
    enabled: boolean,
  ) {
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    const planFeature = await this.prisma.planFeature.upsert({
      where: {
        planId_feature: {
          planId,
          feature,
        },
      },
      create: {
        planId,
        feature,
        enabled,
      },
      update: {
        enabled,
      },
    });

    // Invalidate cache
    this.planRulesService.invalidateByPlanId(planId);

    return planFeature;
  }

  /**
   * Get feature matrix (plan vs feature grid)
   * Useful for UI display
   */
  async getFeatureMatrix() {
    const plans = await this.prisma.plan.findMany({
      where: { level: { gt: 0 } }, // Exclude TRIAL
      include: {
        planFeatures: true,
      },
      orderBy: { level: 'asc' },
    });

    const allFeatures = Object.values(WhatsAppFeature);

    return {
      plans: plans.map((plan) => ({
        id: plan.id,
        code: plan.code ?? plan.name,
        name: plan.name,
        level: plan.level,
      })),
      features: allFeatures,
      matrix: plans.reduce(
        (acc, plan) => {
          const planCode = plan.code ?? plan.name;
          acc[planCode] = allFeatures.reduce(
            (featureAcc, feature) => {
              const planFeature = plan.planFeatures.find(
                (pf) => pf.feature === feature,
              );
              featureAcc[feature] = planFeature?.enabled ?? false;
              return featureAcc;
            },
            {} as Record<string, boolean>,
          );
          return acc;
        },
        {} as Record<string, Record<string, boolean>>,
      ),
    };
  }
}
