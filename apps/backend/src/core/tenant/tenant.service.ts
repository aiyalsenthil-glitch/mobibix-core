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

    const code = name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();

    const tenant = await this.prisma.tenant.create({
      data: { name, code },
    });
    const trialPlan = await this.plansService.getOrCreateTrialPlan();

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
}
