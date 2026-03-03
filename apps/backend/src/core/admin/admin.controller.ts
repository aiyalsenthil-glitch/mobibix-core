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
  ForbiddenException,
  Query,
  Put,
  Req,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TenantService } from '../tenant/tenant.service';
import { SubscriptionsService } from '../billing/subscriptions/subscriptions.service';
import { PlansService } from '../billing/plans/plans.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  UserRole,
  ModuleType,
  SubscriptionStatus,
  BillingCycle,
} from '@prisma/client';
import { Public } from '../auth/decorators/public.decorator';

import { subDays } from 'date-fns';

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
  async injectSubscription(@Body() body: { tenantId: string; planId: string }) {
    const { tenantId, planId } = body;
    if (!tenantId || !planId) {
      throw new BadRequestException('tenantId and planId are required');
    }

    // 0. Fetch Plan to get Module
    const plan = await this.prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) throw new BadRequestException('Plan not found');

    const resolvedModule = plan.module;

    // 1. Upsert Subscription
    const sub = await this.prisma.tenantSubscription.upsert({
      where: {
        tenantId_module: {
          tenantId: tenantId,
          module: resolvedModule,
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
        module: resolvedModule,
        status: 'ACTIVE',
        startDate: new Date(),
        endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
        autoRenew: true,
      },
    });

    // 2. Update Tenant Settings if it's WhatsApp CRM
    if (resolvedModule === 'WHATSAPP_CRM') {
      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: {
          whatsappCrmEnabled: true,
          // Only set default if not already set
          whatsappPhoneNumberId: {
            set:
              (
                await this.prisma.tenant.findUnique({
                  where: { id: tenantId },
                  select: { whatsappPhoneNumberId: true },
                })
              )?.whatsappPhoneNumberId || '100609346426084',
          },
        },
      });
    }

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
  // PRIVACY & ACCOUNT DELETION REQS
  // ─────────────────────────────────────────────
  @Get('privacy/deletions')
  async getDeletionRequests() {
    return this.prisma.deletionRequest.findMany({
      orderBy: { requestedAt: 'desc' },
      include: {
        tenant: {
          select: { name: true, tenantType: true, deletionScheduledAt: true }
        }
      }
    });
  }

  @Post('privacy/deletions/:id/approve')
  async approveDeletionRequest(@Param('id') id: string, @Req() req: any) {
    const adminUserId = req.user.sub || req.user.id;
    return this.tenantService.processDeletionRequest(id, true, adminUserId);
  }

  @Post('privacy/deletions/:id/reject')
  async rejectDeletionRequest(@Param('id') id: string, @Req() req: any) {
    const adminUserId = req.user.sub || req.user.id;
    return this.tenantService.processDeletionRequest(id, false, adminUserId);
  }

  // ─────────────────────────────────────────────
  // TENANT SUBSCRIPTION
  // ─────────────────────────────────────────────
  @Get('tenants/:tenantId/subscription')
  @UseGuards(JwtAuthGuard)
  async getTenantSubscription(
    @Param('tenantId') tenantId: string,
    @Query('module') module?: ModuleType,
    @Req() req?: any,
  ) {
    // Verify requester is authorized (admin/owner can access)
    if (req?.user?.role !== UserRole.OWNER && req?.user?.role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'Only admins can access tenant subscription',
      );
    }
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
      tagline?: string;
      description?: string;
      featuresJson?: string[];
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
  // GLOBAL ANALYTICS (EXECUTIVE)
  // ─────────────────────────────────────────────
  @Get('analytics/global')
  async getGlobalAnalytics() {
    const today = new Date();
    const thirtyDaysAgo = subDays(today, 30);

    // 1. Basic Counts
    const totalTenants = await this.prisma.tenant.count();
    const totalUsers = await this.prisma.user.count();

    // 2. MRR Calculation
    const activeSubs = await this.prisma.tenantSubscription.findMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
      },
      select: {
        priceSnapshot: true,
        billingCycle: true,
      },
    });

    let mrrPaise = 0;
    for (const sub of activeSubs) {
      if (!sub.priceSnapshot) continue;
      const price = sub.priceSnapshot;
      if (sub.billingCycle === 'MONTHLY') {
        mrrPaise += price;
      } else if (sub.billingCycle === 'QUARTERLY') {
        mrrPaise += Math.round(price / 3);
      } else if (sub.billingCycle === 'YEARLY') {
        mrrPaise += Math.round(price / 12);
      }
    }

    // 3. Churn Rate (30 Days)
    const activeCount = await this.prisma.tenantSubscription.count({
      where: { status: SubscriptionStatus.ACTIVE },
    });

    const cancelledRecently = await this.prisma.tenantSubscription.count({
      where: {
        status: SubscriptionStatus.CANCELLED,
        updatedAt: { gte: thirtyDaysAgo },
      },
    });

    const churnRate =
      activeCount + cancelledRecently > 0
        ? Math.round(
            (cancelledRecently / (activeCount + cancelledRecently)) * 100,
          )
        : 0;

    return {
      totalTenants,
      totalUsers,
      mrr: Math.round(mrrPaise / 100), // Convert to major units (Rupees)
      churnRate,
    };
  }

  // ─────────────────────────────────────────────
  // CAPITAL OVERVIEW (INVESTOR)
  // ─────────────────────────────────────────────
  @Get('capital-overview')
  async getCapitalOverview() {
    const stats = await this.getGlobalAnalytics();

    // Derived or mocked capital efficiency metrics
    return {
      ...stats,
      ltv: 3600,
      cac: 150,
      ltvCacRatio: 24,
      paybackMonths: 4,
      burnRate: 0,
      runway: 'Infinite',
      efficiencyScore: 98,
    };
  }

  // ─────────────────────────────────────────────
  // MASTER DATA MANAGEMENT (HSN)
  // ─────────────────────────────────────────────
  @Get('mdm/hsn')
  async getHsnCodes(@Query('search') search?: string) {
    return this.prisma.hSNCode.findMany({
      where: search
        ? {
            OR: [
              { code: { contains: search, mode: 'insensitive' as any } },
              { description: { contains: search, mode: 'insensitive' as any } },
            ],
          }
        : {},
      orderBy: { code: 'asc' },
    });
  }

  @Post('mdm/hsn')
  async upsertHsnCode(@Body() body: any) {
    const { code, description, gstRate } = body;
    const taxRate = parseFloat(gstRate) || 18;

    return this.prisma.hSNCode.upsert({
      where: { code },
      update: { description, taxRate },
      create: { code, description, taxRate },
    });
  }

  // ─────────────────────────────────────────────
  // MASTER DATA MANAGEMENT (GLOBAL PRODUCTS)
  // ─────────────────────────────────────────────
  @Get('mdm/products')
  async getGlobalProducts(
    @Query('search') search?: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where: any = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { category: { name: { contains: search, mode: 'insensitive' } } },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.globalProduct.findMany({
        where,
        include: { category: true, hsn: true },
        skip,
        take,
        orderBy: { name: 'asc' },
      }),
      this.prisma.globalProduct.count({ where }),
    ]);

    // Map to normalized structure expected by frontend
    const items = (data as any[]).map((p) => ({
      ...p,
      category: p.category?.name,
      hsnCode: p.hsn?.code,
      taxRate: p.hsn?.taxRate,
    }));

    return { data: items, total, page: parseInt(page), limit: parseInt(limit) };
  }

  @Post('mdm/products')
  async createGlobalProduct(@Body() body: any) {
    const { name, category: catName, hsnCode, taxRate } = body;

    // 1. Resolve Category
    let category = await this.prisma.productCategory.findUnique({
      where: { name: catName },
    });
    if (!category) {
      category = await this.prisma.productCategory.create({
        data: { name: catName },
      });
    }

    // 2. Resolve HSN
    let hsn = await this.prisma.hSNCode.findUnique({
      where: { code: hsnCode },
    });
    if (!hsn) {
      hsn = await this.prisma.hSNCode.create({
        data: { code: hsnCode, taxRate: parseFloat(taxRate) || 18 },
      });
    }

    // 3. Create Product
    return this.prisma.globalProduct.create({
      data: {
        name,
        categoryId: category.id,
        hsnId: hsn.id,
      },
      include: { category: true, hsn: true },
    });
  }

  @Put('mdm/products/:id')
  async updateGlobalProduct(@Param('id') id: string, @Body() body: any) {
    const { name, category: catName, hsnCode, taxRate } = body;

    // 1. Resolve Category
    let category = await this.prisma.productCategory.findUnique({
      where: { name: catName },
    });
    if (!category) {
      category = await this.prisma.productCategory.create({
        data: { name: catName },
      });
    }

    // 2. Resolve HSN
    let hsn = await this.prisma.hSNCode.findUnique({
      where: { code: hsnCode },
    });
    if (!hsn) {
      hsn = await this.prisma.hSNCode.create({
        data: { code: hsnCode, taxRate: parseFloat(taxRate) || 18 },
      });
    } else if (taxRate !== undefined) {
      await this.prisma.hSNCode.update({
        where: { id: hsn.id },
        data: { taxRate: parseFloat(taxRate) },
      });
    }

    // 3. Update Product
    return this.prisma.globalProduct.update({
      where: { id },
      data: {
        name,
        categoryId: category.id,
        hsnId: hsn.id,
      },
      include: { category: true, hsn: true },
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
  // SYSTEM HEALTH: WEBHOOK LOGS (ADMIN)
  // ─────────────────────────────────────────────
  @Get('system/webhook-logs')
  async getWebhookLogs(
    @Query('search') search?: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where: any = search
      ? {
          OR: [
            { provider: { contains: search, mode: 'insensitive' } },
            { eventType: { contains: search, mode: 'insensitive' } },
            { referenceId: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.webhookEvent.findMany({
        where,
        skip,
        take,
        orderBy: { receivedAt: 'desc' },
      }),
      this.prisma.webhookEvent.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        lastPage: Math.ceil(total / take),
      },
    };
  }

  // ─────────────────────────────────────────────
  // TENANT IMPERSONATION (ADMIN)
  // ─────────────────────────────────────────────
  @Post('tenants/:id/impersonate')
  async impersonateTenant(@Param('id') tenantId: string, @Req() req: any) {
    const adminUserId = req.user.sub || req.user.id;

    // Check if actor is SUPER_ADMIN
    const adminUser = await this.prisma.adminUser.findUnique({
      where: { userId: adminUserId },
    });

    if (!adminUser || adminUser.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only SUPER_ADMIN can impersonate tenants');
    }

    // 1. Find the owner of the tenant
    const ownerRecord = await this.prisma.userTenant.findFirst({
      where: {
        tenantId,
        role: { in: [UserRole.OWNER, UserRole.ADMIN] }, // Usually owner, but could be another admin
      },
      include: { user: true, tenant: true },
      orderBy: { role: 'asc' }, // Prefer OWNER if both exist logic
    });

    if (!ownerRecord) {
      throw new NotFoundException('No eligible owner found for impersonation');
    }

    // 2. Issue short-lived JWT for the target user context (15m)
    const token = this.tenantService.issueJwt(
      {
        userId: ownerRecord.userId,
        tenantId: ownerRecord.tenantId,
        userTenantId: ownerRecord.id,
        role: ownerRecord.role,
      },
      '15m',
    );

    // 3. Log the action (Platform Audit) with IP and target details
    await this.prisma.platformAuditLog.create({
      data: {
        userId: adminUserId,
        action: 'IMPERSONATE_TENANT',
        entity: 'TENANT',
        entityId: tenantId,
        meta: {
          tenantCode: ownerRecord.tenant.code,
          targetUser: ownerRecord.user.email,
          ip: req.ip || req.connection?.remoteAddress,
          expiresIn: '15m',
        },
      },
    });

    return {
      token,
      user: {
        id: ownerRecord.user.id,
        email: ownerRecord.user.email,
        role: ownerRecord.role,
        tenantId: ownerRecord.tenantId,
      },
      expiresIn: 900, // 15 minutes
    };
  }

  // ─────────────────────────────────────────────
  // PLATFORM AUDIT LOGS (ADMIN)
  // ─────────────────────────────────────────────
  @Get('system/audit-logs')
  async getPlatformAuditLogs(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [data, total] = await Promise.all([
      this.prisma.platformAuditLog.findMany({
        include: { user: true },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.platformAuditLog.count(),
    ]);

    return {
      data,
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        lastPage: Math.ceil(total / take),
      },
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
      action: 'ENABLE' | 'DISABLE';
      planId?: string;
      module?: ModuleType;
    },
  ) {
    const { tenantId, action, planId, module } = body;
    if (!tenantId || !action) {
      throw new BadRequestException('tenantId and action are required');
    }

    return this.subscriptionsService.manageAddon(
      tenantId,
      action,
      planId,
      module,
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

  // ─────────────────────────────────────────────
  // NOTIFICATION LOGS (PLATFORM ADMIN)
  // ─────────────────────────────────────────────
  @Get('notifications/logs')
  async getNotificationLogs(
    @Query('tenantId') tenantId?: string,
    @Query('eventId') eventId?: string,
    @Query('status') status?: any,
  ) {
    const where: any = {};
    if (tenantId) where.tenantId = tenantId;
    if (eventId) where.eventId = eventId;
    if (status) where.status = status;

    return this.prisma.notificationLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        tenant: { select: { name: true } },
        user: { select: { email: true, phone: true } },
      },
    });
  }

  // ─────────────────────────────────────────────
  // REVENUE PROTECTION ANALYTICS (PLATFORM ADMIN)
  // ─────────────────────────────────────────────
  @Get('analytics/revenue-protection')
  async getRevenueProtectionStats() {
    const [overdueCount, expiredCount, pendingDeletionCount] =
      await Promise.all([
        this.prisma.tenantSubscription.count({
          where: { status: SubscriptionStatus.PAST_DUE },
        }),
        this.prisma.tenantSubscription.count({
          where: { status: SubscriptionStatus.EXPIRED },
        }),
        this.prisma.tenant.count({
          where: { status: 'PENDING_DELETION' },
        }),
      ]);

    return {
      overdueCount,
      expiredCount,
      pendingDeletionCount,
    };
  }
}
