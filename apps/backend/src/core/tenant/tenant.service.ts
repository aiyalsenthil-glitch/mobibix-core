import { PlansService } from '../billing/plans/plans.service';
import { SubscriptionsService } from '../billing/subscriptions/subscriptions.service';
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TenantService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly plansService: PlansService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  async findById() {
    const tenantId = this.prisma.getTenantId();
    if (!tenantId) {
      return null; // Owner hasn't created tenant yet
    }
    return this.prisma.tenant.findFirst({
      where: { id: tenantId },
    });
  }
  async listTenantsWithSubscription() {
    return this.prisma.tenant.findMany({
      include: {
        subscription: {
          include: { plan: true },
        },
      },
    });
  }
  async createTenant(userId: string, name: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.tenantId) {
      throw new BadRequestException('User already has a tenant');
    }

    // 🔑 Ensure BASIC / PRO plans exist (safe, idempotent)
    await this.plansService.ensureDefaultPlans();

    // 🔑 Ensure TRIAL plan exists
    const trialPlan = await this.plansService.getOrCreateTrialPlan();

    const code = name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();

    const tenant = await this.prisma.tenant.create({
      data: { name, code },
    });

    // 🔑 Assign TRIAL subscription
    await this.subscriptionsService.assignTrialSubscription(
      tenant.id,
      trialPlan.id,
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        tenantId: tenant.id,
        role: 'owner',
      },
    });

    return tenant;
  }
  async getUsageStats(tenantId: string) {
    const subscription = await this.prisma.tenantSubscription.findUnique({
      where: { tenantId },
      include: { plan: true },
    });

    const membersUsed = await this.prisma.member.count({
      where: { tenantId },
    });

    const planName = subscription?.plan?.name ?? 'TRIAL';

    let membersLimit: number | null = null;

    if (planName === 'TRIAL') membersLimit = 25;
    if (planName === 'BASIC') membersLimit = 100;
    if (planName === 'PRO') membersLimit = null;

    let daysLeft: number | null = null;

    if (subscription?.endDate) {
      const now = new Date();
      const end = new Date(subscription.endDate);
      const diff = end.getTime() - now.getTime();
      daysLeft = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }

    return {
      plan: planName,
      status: subscription?.status ?? 'NONE',
      membersUsed,
      membersLimit,
      daysLeft,
    };
  }
}
