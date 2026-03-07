import {
  Controller,
  Get,
  Req,
  UseGuards,
  UnauthorizedException,
  Query,
  Patch,
  Body,
  Post,
  Delete,
  Param,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantRequiredGuard } from '../../auth/guards/tenant.guard';
import { SubscriptionsService } from './subscriptions.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  SubscriptionStatus,
  ModuleType,
  BillingCycle,
  UserRole,
  BillingType,
} from '@prisma/client';
import {
  ToggleAutoRenewDto,
  AddSubscriptionAddonDto,
} from '../dto/phase1-subscriptions.dto';
import {
  DowngradeCheckQueryDto,
  DowngradeSubscriptionDto,
} from './dto/downgrade.dto';
import { Roles } from '../../auth/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, TenantRequiredGuard)
@Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.STAFF)
@Controller('billing/subscription')
export class SubscriptionsController {
  private readonly logger = new Logger(SubscriptionsController.name);

  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly prisma: PrismaService,
  ) {}
  @Get('current')
  async getCurrent(@Req() req: any, @Query('module') module?: ModuleType) {
    const tenantId = req.user.tenantId;

    // 1️⃣ Resolve module and fetch initial data in parallel
    const [tenant, legacyWhatsappSub] = await Promise.all([
      this.prisma.tenant.findUnique({
        where: { id: req.user.tenantId },
        select: { tenantType: true },
      }),
      module !== (ModuleType.WHATSAPP_CRM as any)
        ? this.prisma.tenantSubscription.findFirst({
            where: {
              tenantId: req.user.tenantId,
              module: 'WHATSAPP_CRM' as ModuleType,
              status: SubscriptionStatus.ACTIVE,
            },
            include: { plan: { include: { planFeatures: true } } },
          })
        : Promise.resolve(null),
    ]);

    let resolvedModule = module;
    if (!resolvedModule) {
      resolvedModule =
        tenant?.tenantType === 'GYM' ? ModuleType.GYM : ModuleType.MOBILE_SHOP;
    }

    // 2️⃣ Fetch subscription data in parallel
    const [sub, upcoming] = await Promise.all([
      this.subscriptionsService.getCurrentActiveSubscription(
        req.user.tenantId,
        resolvedModule,
      ),
      this.subscriptionsService.getUpcomingSubscription(
        req.user.tenantId,
        resolvedModule,
      ),
    ]);

    // No active subscription → trial fallback
    if (!sub) {
      return {
        current: {
          plan: resolvedModule === 'GYM' ? 'GYM_TRIAL' : 'MOBIBIX_TRIAL',
          planCode: resolvedModule === 'GYM' ? 'GYM_TRIAL' : 'MOBIBIX_TRIAL',
          level: 0,
          daysLeft: 0,
          isTrial: true,
          subscriptionStatus: 'TRIAL',
          canUpgrade: true,
          autoRenew: false,
          subscriptionId: null,
          memberLimit: 100, // Default Trial Limits
          maxStaff: 5,
          whatsappAllowed: true,
          staffAllowed: true,
          attendanceAllowed: resolvedModule === 'GYM',
        },
        upcoming: null,
      };
    }

    const now = new Date();
    const endDate = new Date(sub.endDate);
    const daysLeft = Math.max(
      Math.ceil(
        (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      ),
      0,
    );

    const subscriptionStatus: 'ACTIVE' | 'TRIAL' | 'EXPIRED' =
      endDate < now
        ? 'EXPIRED'
        : sub.status === 'TRIAL'
          ? 'TRIAL'
          : 'ACTIVE';

    // ⚡ Optimization: Features are already included in the sub query
    const plan = sub.plan;

    // 🔥 NEW: Merge features from active-plan, addons, and legacy-CRM
    const planFeatures =
      plan.planFeatures?.filter((f) => f.enabled).map((f) => f.feature) || [];

    const addonFeatures = (sub.addons || [])
      .filter((a) => a.status === SubscriptionStatus.ACTIVE)
      .flatMap((a) => a.addonPlan?.planFeatures || [])
      .filter((f: any) => f.enabled)
      .map((f: any) => f.feature);

    const legacyFeatures =
      legacyWhatsappSub?.plan.planFeatures
        .filter((f: any) => f.enabled)
        .map((f: any) => f.feature) || [];

    const allFeatures = Array.from(
      new Set([...planFeatures, ...addonFeatures, ...legacyFeatures]),
    );

    // 🚀 NEW: Database-driven plan details

    const planDetails = {
      name: plan.name,
      code: plan.code,
      level: plan.level,
      tagline: plan.tagline,
      description: plan.description,
      features: allFeatures,
      featuresJson: plan.featuresJson,

      // Limits from DB
      memberLimit: plan.maxMembers,
      maxStaff: plan.maxStaff,
      whatsappAllowed: allFeatures.includes('WHATSAPP_UTILITY'),
      staffAllowed: allFeatures.includes('STAFF'),
      attendanceAllowed: allFeatures.includes('ATTENDANCE'),
      analyticsHistoryDays: plan.analyticsHistoryDays,
    };

    const addons = (sub.addons || []).map((a) => ({
      id: a.id,
      name: a.addonPlan.name,
      code: a.addonPlan.code,
      tagline: a.addonPlan.tagline,
      status: a.status,
      endDate: a.endDate,
      priceSnapshot: a.priceSnapshot,
      features: a.addonPlan.planFeatures
        .filter((f) => f.enabled)
        .map((f) => f.feature),
    }));

    const canUpgrade = true;
    return {
      current: {
        ...planDetails,
        addons,
        daysLeft,
        isTrial: sub.status === 'TRIAL',
        subscriptionStatus,
        autoRenew: sub.autoRenew,
        billingType: sub.billingType,
        subscriptionId: sub.id,
      },
      upcoming: upcoming
        ? {
            plan: upcoming.plan.name,
            startsAt: upcoming.startDate,
            endsAt: upcoming.endDate,
          }
        : null,
    };
  }

  @Patch('auto-renew')
  async toggleAutoRenew(
    @Req() req: any,
    @Body() dto: ToggleAutoRenewDto,
    @Query('module') module?: ModuleType,
  ) {
    const tenantId = req.user.tenantId;

    let resolvedModule = module;
    if (!resolvedModule) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: req.user.tenantId },
        select: { tenantType: true },
      });

      if (tenant) {
        resolvedModule = tenant.tenantType === 'GYM' ? 'GYM' : 'MOBILE_SHOP';
      } else {
        resolvedModule = 'MOBILE_SHOP';
      }
    }

    const sub = await this.subscriptionsService.getCurrentActiveSubscription(
      req.user.tenantId,
      resolvedModule,
    );

    if (!sub) {
      throw new BadRequestException('No active subscription to update');
    }

    const updated = await this.subscriptionsService.toggleAutoRenew(
      sub.id,
      dto.enabled,
    );

    return {
      subscriptionId: updated.id,
      autoRenew: updated.autoRenew,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 🔄 UPGRADE SUBSCRIPTION (Immediate Plan Change)
  // ═══════════════════════════════════════════════════════════════════════════
  @Patch('upgrade')
  async upgradeSubscription(
    @Req() req: any,
    @Body()
    body: {
      newPlanId: string;
      newBillingCycle?: BillingCycle;
      billingType?: BillingType;
    },
    @Query('module') module?: ModuleType,
  ) {
    const tenantId = req.user.tenantId;

    const { newPlanId, newBillingCycle, billingType } = body;

    if (!newPlanId) {
      throw new BadRequestException('newPlanId is required');
    }

    // 🔍 Resolve module if not provided
    let resolvedModule = module;
    if (!resolvedModule) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: req.user.tenantId },
        select: { tenantType: true },
      });

      if (tenant) {
        resolvedModule =
          tenant.tenantType === 'GYM' ? ModuleType.GYM : ModuleType.MOBILE_SHOP;
      } else {
        resolvedModule = ModuleType.MOBILE_SHOP;
      }
    }

    // 1️⃣ Get current active subscription (or valid Trial)
    const currentSub =
      await this.subscriptionsService.getCurrentActiveSubscription(
        req.user.tenantId,
        resolvedModule,
      );

    // If no active/valid-trial subscription found, OR it's a TRIAL
    // We treat this as a "BUY" operation (converting to paid)
    if (!currentSub || currentSub.status === SubscriptionStatus.TRIAL) {
      const bought = await this.subscriptionsService.buyPlanPhase1({
        tenantId: req.user.tenantId,
        planId: newPlanId,
        module: resolvedModule,
        billingCycle: newBillingCycle || BillingCycle.MONTHLY,
        autoRenew: billingType === BillingType.AUTOPAY,
        billingType: billingType || BillingType.MANUAL,
      });

      this.logger.log(
        `✅ Buy/Activate API: tenantId=${req.user.tenantId}, ` +
          `subscriptionId=${bought.id}, planId=${bought.planId}`,
      );

      return {
        success: true,
        subscriptionId: bought.id,
        planId: bought.planId,
        paymentLink: bought.paymentLink,
        REMOVED_PAYMENT_INFRASubscriptionId: bought.subscriptionId,
        message: bought.paymentLink
          ? 'Payment Link generated. Please complete payment.'
          : bought.subscriptionId
            ? 'Subscription initialized. Please complete authorization.'
            : 'Plan activated successfully.',
      };
    }

    // 2️⃣ Call upgradePlan service (Active -> Active)
    const upgraded = await this.subscriptionsService.upgradePlan({
      subscriptionId: currentSub.id,
      newPlanId,
      newBillingCycle,
    });

    this.logger.log(
      `✅ Upgrade API: tenantId=${req.user.tenantId}, ` +
        `subscriptionId=${upgraded.id}, newPlanId=${newPlanId}`,
    );

    return {
      success: true,
      subscriptionId: upgraded.id,
      planId: upgraded.planId,
      nextPriceSnapshot: upgraded.nextPriceSnapshot,
      message: 'Plan upgraded immediately. New price applies at next renewal.',
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 📉 DOWNGRADE SUBSCRIPTION (Scheduled)
  // ═══════════════════════════════════════════════════════════════════════════
  @Patch('downgrade')
  async downgradeSubscription(
    @Req() req: any,
    @Body() body: DowngradeSubscriptionDto,
    @Query('module') module?: ModuleType,
  ) {
    const tenantId = req.user.tenantId;

    const { newPlanId, newBillingCycle, isImmediate } = body;

    if (!newPlanId) {
      throw new BadRequestException('newPlanId is required');
    }

    // 🔍 Resolve module if not provided
    let resolvedModule = module;
    if (!resolvedModule) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: req.user.tenantId },
        select: { tenantType: true },
      });

      if (tenant) {
        resolvedModule =
          tenant.tenantType === 'GYM' ? ModuleType.GYM : ModuleType.MOBILE_SHOP;
      } else {
        resolvedModule = ModuleType.MOBILE_SHOP;
      }
    }

    // 1️⃣ Get current active subscription
    const currentSub =
      await this.subscriptionsService.getCurrentActiveSubscription(
        req.user.tenantId,
        resolvedModule,
      );

    if (!currentSub) {
      throw new BadRequestException('No active subscription to downgrade.');
    }

    // 2️⃣ Call downgradeScheduled service
    const downgraded = await this.subscriptionsService.downgradeScheduled({
      subscriptionId: currentSub.id,
      newPlanId,
      newBillingCycle,
      immediate: isImmediate,
    });

    this.logger.log(
      `📉 Downgrade API: tenantId=${req.user.tenantId}, ` +
        `subscriptionId=${downgraded.id}, newPlanId=${newPlanId}, immediate=${isImmediate}`,
    );

    return {
      success: true,
      subscriptionId: downgraded.id,
      nextPlanId: downgraded.nextPlanId,
      message: isImmediate
        ? 'Plan downgraded immediately.'
        : 'Plan downgrade scheduled. Changes apply at next renewal.',
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 💎 SUBSCRIPTION ADD-ONS (Generic)
  // ═══════════════════════════════════════════════════════════════════════════
  @Post('addons')
  async addAddon(
    @Req() req: any,
    @Body() dto: AddSubscriptionAddonDto,
    @Query('module') module?: ModuleType,
  ) {
    const tenantId = req.user.tenantId;

    // 1. Resolve module
    let resolvedModule = module;
    if (!resolvedModule) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: req.user.tenantId },
        select: { tenantType: true },
      });
      resolvedModule =
        tenant?.tenantType === 'GYM' ? ModuleType.GYM : ModuleType.MOBILE_SHOP;
    }

    // 2. Find current active subscription for this module
    const currentSub =
      await this.subscriptionsService.getCurrentActiveSubscription(
        req.user.tenantId,
        resolvedModule,
      );

    if (!currentSub) {
      throw new BadRequestException(
        'No active subscription to attach an addon to.',
      );
    }

    // 3. Call buyAddon service
    return this.subscriptionsService.buyAddon({
      subscriptionId: currentSub.id,
      addonPlanId: dto.addonPlanId,
      billingCycle: dto.billingCycle,
      autoRenew: dto.autoRenew,
    });
  }

  /**
   * Pre-check if downgrade is allowed
   * TODO: Implement after downgradeSubscription method is added
   */
  @Get('downgrade-check')
  async checkDowngrade(
    @Req() req: any,
    @Query() query: DowngradeCheckQueryDto,
  ) {
    const tenantId = req.user.tenantId;

    const targetPlanId = query.targetPlan;

    // Resolve module
    let resolvedModule = query.module;
    if (!resolvedModule) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: req.user.tenantId },
        select: { tenantType: true },
      });
      resolvedModule = tenant?.tenantType === 'GYM' ? 'GYM' : 'MOBILE_SHOP';
    }

    return this.subscriptionsService.downgradePreCheck(
      req.user.tenantId,
      targetPlanId,
      resolvedModule,
    );
  }
}
