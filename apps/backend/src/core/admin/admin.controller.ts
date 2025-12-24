import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TenantService } from '../tenant/tenant.service';
import { SubscriptionsService } from '../billing/subscriptions/subscriptions.service';
import { PlansService } from '../billing/plans/plans.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(
    private readonly tenantService: TenantService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly plansService: PlansService,
    private readonly prisma: PrismaService,
  ) {}

  // ─────────────────────────────────────────────
  // BOOTSTRAP PLATFORM ADMIN (DEV ONLY)
  // ─────────────────────────────────────────────
  @Post('bootstrap')
  async bootstrapAdmin(@Body() body: { email: string; REMOVED_AUTH_PROVIDERUid: string }) {
    if (process.env.NODE_ENV === 'production') {
      throw new BadRequestException('Bootstrap disabled in production');
    }

    const existingAdmin = await this.prisma.user.findFirst({
      where: { role: UserRole.ADMIN },
    });

    if (existingAdmin) {
      return {
        message: 'Admin already exists',
        adminId: existingAdmin.id,
      };
    }

    const admin = await this.prisma.user.create({
      data: {
        email: body.email,
        REMOVED_AUTH_PROVIDERUid: body.REMOVED_AUTH_PROVIDERUid,
        role: UserRole.ADMIN,
        tenantId: null,
      },
    });

    return {
      message: 'Platform admin created',
      admin,
    };
  }

  // ─────────────────────────────────────────────
  // LIST ALL TENANTS
  // ─────────────────────────────────────────────
  @Get('tenants')
  async listTenants() {
    return this.tenantService.listTenantsWithSubscription();
  }

  // ─────────────────────────────────────────────
  // TENANT SUBSCRIPTION
  // ─────────────────────────────────────────────
  @Get('tenants/:tenantId/subscription')
  async getTenantSubscription(@Param('tenantId') tenantId: string) {
    return this.subscriptionsService.getSubscriptionByTenant(tenantId);
  }

  // ─────────────────────────────────────────────
  // EXTEND TRIAL
  // ─────────────────────────────────────────────
  @Patch('tenants/:tenantId/extend-trial')
  async extendTrial(
    @Param('tenantId') tenantId: string,
    @Body() body: { extraDays: number },
  ) {
    return this.subscriptionsService.extendTrial(tenantId, body.extraDays);
  }
  // ─────────────────────────────────────────────
  // Create PLAN (PLATFORM ADMIN)
  // ─────────────────────────────────────────────
  @Post('plans')
  createPlan(@Body() body) {
    return this.plansService.createPlan(body);
  }

  @Post('seed-plans')
  async seedPlans() {
    return this.plansService.ensureDefaultPlans();
  }
  // ─────────────────────────────────────────────
  // UPDATE PLAN (PLATFORM ADMIN)
  // ─────────────────────────────────────────────
  @Patch('plans/:planId')
  @Patch('plans/:planId')
  async updatePlan(
    @Param('planId') planId: string,
    @Body()
    body: {
      price?: number;
      durationDays?: number;
      memberLimit?: number;
      isActive?: boolean;
    },
  ) {
    return this.plansService.updatePlan(planId, body);
  }

  // ─────────────────────────────────────────────
  // CHANGE STATUS
  // ─────────────────────────────────────────────
  @Patch('tenants/:tenantId/status')
  async changeStatus(
    @Param('tenantId') tenantId: string,
    @Body() body: { status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED' },
  ) {
    return this.subscriptionsService.changeStatus(tenantId, body.status);
  }

  // ─────────────────────────────────────────────
  // PAYMENT HISTORY
  // ─────────────────────────────────────────────
  @Get('tenants/:tenantId/payments')
  async getTenantPayments(@Param('tenantId') tenantId: string) {
    return this.prisma.payment.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
