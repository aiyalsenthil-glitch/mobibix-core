import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/roles.enum';
import { TenantService } from '../tenant/tenant.service';
import { SubscriptionsService } from '../billing/subscriptions/subscriptions.service';
import { PlansService } from '../billing/plans/plans.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(
    private readonly tenantService: TenantService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly plansService: PlansService,
    private readonly prisma: PrismaService,
  ) {}

  // ─────────────────────────────────────────────
  // LIST ALL TENANTS + SUBSCRIPTION
  // ─────────────────────────────────────────────
  @Get('tenants')
  async listTenants() {
    return this.tenantService.listTenantsWithSubscription();
  }

  // ─────────────────────────────────────────────
  // GET TENANT SUBSCRIPTION
  // ─────────────────────────────────────────────
  @Get('tenants/:tenantId/subscription')
  async getTenantSubscription(@Param('tenantId') tenantId: string) {
    return this.subscriptionsService.getSubscriptionByTenant(tenantId);
  }

  // ─────────────────────────────────────────────
  // EXTEND TRIAL (ADMIN ACTION)
  // ─────────────────────────────────────────────
  @Patch('tenants/:tenantId/extend-trial')
  async extendTrial(
    @Param('tenantId') tenantId: string,
    @Body() body: { extraDays: number },
  ) {
    return this.subscriptionsService.extendTrial(tenantId, body.extraDays);
  }

  // ─────────────────────────────────────────────
  // SEED DEFAULT PLANS (ONE-TIME ADMIN)
  // ─────────────────────────────────────────────
  @Post('seed-plans')
  async seedPlans() {
    return this.plansService.ensureDefaultPlans();
  }

  // ─────────────────────────────────────────────
  // CHANGE SUBSCRIPTION STATUS
  // ─────────────────────────────────────────────
  @Patch('tenants/:tenantId/status')
  async changeStatus(
    @Param('tenantId') tenantId: string,
    @Body() body: { status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED' },
  ) {
    return this.subscriptionsService.changeStatus(tenantId, body.status);
  }

  // ─────────────────────────────────────────────
  // UPGRADE PLAN (ADMIN OVERRIDE)
  // ─────────────────────────────────────────────
  @Patch('tenants/:tenantId/upgrade')
  async upgradeTenant(
    @Param('tenantId') tenantId: string,
    @Body() body: { plan: 'BASIC' | 'PRO' },
  ) {
    return this.subscriptionsService.upgradeSubscription(tenantId, body.plan);
  }

  // ─────────────────────────────────────────────
  // PAYMENT HISTORY (ADMIN BILLING VIEW)
  // ─────────────────────────────────────────────
  @Get('tenants/:tenantId/payments')
  async getTenantPayments(@Param('tenantId') tenantId: string) {
    return this.prisma.payment.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
