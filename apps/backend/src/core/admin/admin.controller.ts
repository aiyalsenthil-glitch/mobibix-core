import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  BadRequestException,
  NotFoundException,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TenantService } from '../tenant/tenant.service';
import { SubscriptionsService } from '../billing/subscriptions/subscriptions.service';
import { PlansService } from '../billing/plans/plans.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole, ModuleType, SubscriptionStatus } from '@prisma/client';

import { Public } from '../auth/decorators/public.decorator';

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
  @Public()
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
  // INJECT SUBSCRIPTION (ADMIN)
  // ─────────────────────────────────────────────
  @Post('inject-sub')
  async injectSubscription(
    @Body() body: { tenantId: string; planId: string },
  ) {
    const { tenantId, planId } = body;
    if (!tenantId || !planId) {
      throw new BadRequestException('tenantId and planId are required');
    }

    console.log(`[Admin] Injecting plan for ${tenantId}...`);

    // 1. Upsert Subscription
    const sub = await this.prisma.tenantSubscription.upsert({
      where: {
        tenantId_module: {
          tenantId: tenantId,
          module: 'WHATSAPP_CRM',
        },
      },
      update: {
        status: 'ACTIVE',
        planId: planId,
        startDate: new Date(),
        endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
        autoRenew: true,
      },
      create: {
        tenantId: tenantId,
        planId: planId,
        module: 'WHATSAPP_CRM',
        status: 'ACTIVE',
        startDate: new Date(),
        endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
        autoRenew: true,
      },
    });

    // 2. Update Tenant Settings
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        whatsappCrmEnabled: true,
        whatsappPhoneNumberId: '100609346426084', // Default ID from raw route
        tenantType: 'MOBILE_SHOP',
      },
    });

    return {
      success: true,
      message: 'Plan injected successfully',
      subscription: sub,
    };
  }

  // ─────────────────────────────────────────────
  // LIST ALL PLANS (ADMIN)
  // ─────────────────────────────────────────────
  @Get('plans')
  async listAllPlans() {
    return this.plansService.getPlans(); // all plans (active + inactive)
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
  async getTenantSubscription(
    @Param('tenantId') tenantId: string,
    @Query('module') module?: ModuleType,
  ) {
    let resolvedModule = module;
    if (!resolvedModule) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { tenantType: true },
      });
      resolvedModule = tenant?.tenantType === 'GYM' ? 'GYM' : 'MOBILE_SHOP';
    }
    return this.subscriptionsService.getSubscriptionByTenant(
      tenantId,
      resolvedModule,
    );
  }
  // ─────────────────────────────────────────────
  // TENANT USAGE (ADMIN)
  // ─────────────────────────────────────────────
  @Get('tenants/:tenantId/usage')
  async getTenantUsage(@Param('tenantId') tenantId: string) {
    return this.tenantService.getUsage(tenantId);
  }

  // ─────────────────────────────────────────────
  // EXTEND TRIAL
  // ─────────────────────────────────────────────
  @Patch('tenants/:tenantId/extend-trial')
  async extendTrial(
    @Param('tenantId') tenantId: string,
    @Body() body: { extraDays: number; module?: ModuleType },
  ) {
    let resolvedModule = body.module;
    if (!resolvedModule) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { tenantType: true },
      });
      resolvedModule = tenant?.tenantType === 'GYM' ? 'GYM' : 'MOBILE_SHOP';
    }

    return this.subscriptionsService.extendTrial(
      tenantId,
      body.extraDays,
      resolvedModule,
    );
  }
  // ─────────────────────────────────────────────
  // Create PLAN (PLATFORM ADMIN)
  // ─────────────────────────────────────────────
  @Post('plans')
  createPlan(@Body() body) {
    return this.plansService.createPlan(body);
  }

  // ─────────────────────────────────────────────
  // UPDATE PLAN (PLATFORM ADMIN)
  // ─────────────────────────────────────────────
  @Patch('plans/:planId')
  async updatePlan(
    @Param('planId') planId: string,
    @Body()
    body: {
      name?: string;
      level?: number;
      module?: ModuleType;
      isActive?: boolean;
      isPublic?: boolean;
      isAddon?: boolean;
    },
  ) {
    return this.plansService.updatePlan(planId, body);
  }
  // ─────────────────────────────────────────────
  // CHANGE TENANT PLAN (ADMIN)
  // ─────────────────────────────────────────────
  @Patch('tenants/:tenantId/plan')
  async changeTenantPlan(
    @Param('tenantId') tenantId: string,
    @Body() body: { planName: string; module?: string },
  ) {
    if (!body.planName) {
      throw new BadRequestException('planName is required');
    }

    let resolvedModule = body.module as ModuleType;
    if (!resolvedModule) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { tenantType: true },
      });
      resolvedModule =
        tenant?.tenantType === 'GYM' ? 'GYM' : ('MOBILE_SHOP' as ModuleType);
    }

    return this.subscriptionsService.changePlan(
      tenantId,
      body.planName,
      resolvedModule,
    );
  }

  // ─────────────────────────────────────────────
  // CHANGE STATUS (ADMIN)
  // ─────────────────────────────────────────────
  @Patch('tenants/:tenantId/status')
  async changeStatus(
    @Param('tenantId') tenantId: string,
    @Body() body: { status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED' },
  ) {
    const { status } = body;

    if (!['ACTIVE', 'EXPIRED', 'CANCELLED'].includes(status)) {
      throw new BadRequestException('Invalid status');
    }

    const currentSub = await this.prisma.tenantSubscription.findFirst({
      where: { tenantId },
      orderBy: { startDate: 'desc' },
    });

    if (!currentSub) {
      throw new NotFoundException('Subscription not found');
    }

    return this.prisma.tenantSubscription.update({
      where: { id: currentSub.id },
      data: { status },
    });
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

  // ─────────────────────────────────────────────
  // USER LOOKUP (ADMIN)
  // ─────────────────────────────────────────────
  @Get('users/lookup')
  async lookupUser(@Query('email') email: string) {
    if (!email) {
      throw new BadRequestException('Email is required');
    }

    const user = await this.prisma.user.findFirst({
      where: { email },
      include: {
        userTenants: {
          where: { role: UserRole.OWNER },
          include: {
            tenant: {
              include: {
                subscription: {
                  where: {
                    status: {
                      in: [
                        SubscriptionStatus.ACTIVE,
                        SubscriptionStatus.TRIAL,
                        SubscriptionStatus.SCHEDULED,
                      ],
                    },
                  },
                  include: { plan: true },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Format response
    const tenants = user.userTenants.map((ut) => {
      return {
        tenantId: ut.tenantId,
        name: ut.tenant.name,
        role: ut.role,
        subscriptions: ut.tenant.subscription.map((sub) => ({
          id: sub.id,
          module: sub.module,
          plan: sub.plan.name,
          planId: sub.planId,
          status: sub.status,
          endDate: sub.endDate,
        })),
        whatsappCrmEnabled: ut.tenant.whatsappCrmEnabled,
      };
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        REMOVED_AUTH_PROVIDERUid: user.REMOVED_AUTH_PROVIDERUid,
      },
      tenants,
    };
  }

  // ─────────────────────────────────────────────
  // UPGRADE PLAN (ADMIN)
  // ─────────────────────────────────────────────
  @Post('subscription/upgrade')
  async upgradePlan(
    @Body() body: { tenantId: string; planName: string; module: ModuleType },
  ) {
    const { tenantId, planName, module } = body;
    if (!tenantId || !planName || !module) {
      throw new BadRequestException(
        'tenantId, planName, and module are required',
      );
    }

    return this.subscriptionsService.changePlan(tenantId, planName, module);
  }

  // ─────────────────────────────────────────────
  // UPGRADE PLAN BY EMAIL (ADMIN CONVENIENCE)
  // ─────────────────────────────────────────────
  @Post('subscription/upgrade-by-email')
  async upgradePlanByEmail(
    @Body() body: { email: string; planName: string; module: ModuleType },
  ) {
    const { email, planName, module } = body;
    if (!email || !planName || !module) {
      throw new BadRequestException('email, planName, and module are required');
    }

    // 1. Find User
    const user = await this.prisma.user.findFirst({
      where: { email },
      include: {
        userTenants: {
          where: { role: UserRole.OWNER },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 2. Check Tenants
    if (user.userTenants.length === 0) {
      throw new BadRequestException('User does not own any tenants');
    }

    if (user.userTenants.length > 1) {
      throw new BadRequestException(
        'User owns multiple tenants. Please use GET /admin/users/lookup to find the correct Tenant ID.',
      );
    }

    const tenantId = user.userTenants[0].tenantId;

    // 3. Upgrade
    return this.subscriptionsService.changePlan(tenantId, planName, module);
  }

  // ─────────────────────────────────────────────
  // MANAGE ADDON (ADMIN)
  // ─────────────────────────────────────────────
  @Post('subscription/addon')
  async manageAddon(
    @Body()
    body: {
      tenantId: string;
      addon: 'WHATSAPP_CRM';
      action: 'ENABLE' | 'DISABLE';
      planId?: string;
    },
  ) {
    const { tenantId, addon, action, planId } = body;
    if (!tenantId || !addon || !action) {
      throw new BadRequestException('tenantId, addon, and action are required');
    }

    return this.subscriptionsService.manageAddon(
      tenantId,
      addon,
      action,
      planId,
    );
  }
  // ─────────────────────────────────────────────
  // DOWNGRADE CHECK (ADMIN)
  // ─────────────────────────────────────────────
  @Get('subscription/downgrade-check')
  async checkDowngrade(
    @Query('tenantId') tenantId: string,
    @Query('targetPlanId') targetPlanId: string,
    @Query('module') module?: ModuleType,
  ) {
    if (!tenantId || !targetPlanId) {
      throw new BadRequestException('tenantId and targetPlanId are required');
    }

    let resolvedModule = module;
    if (!resolvedModule) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { tenantType: true },
      });
      resolvedModule =
        tenant?.tenantType === 'GYM' ? 'GYM' : ('MOBILE_SHOP' as ModuleType);
    }

    return this.subscriptionsService.checkDowngradeEligibility(
      tenantId,
      targetPlanId,
      resolvedModule,
    );
  }
}
