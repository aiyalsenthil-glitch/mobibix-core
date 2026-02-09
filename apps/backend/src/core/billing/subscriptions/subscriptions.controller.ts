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
import { SubscriptionsService } from './subscriptions.service';
import { ModuleType, BillingCycle, UserRole } from '@prisma/client';
import { Roles } from '../../auth/decorators/roles.decorator';

import { PrismaService } from '../../prisma/prisma.service';
import {
  ToggleAutoRenewDto,
  AddSubscriptionAddonDto,
} from '../dto/phase1-subscriptions.dto';

@UseGuards(JwtAuthGuard)
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
    if (!req.user || !req.user.tenantId) {
      throw new UnauthorizedException('Authentication required');
    }

    let resolvedModule = module;

    // 🔍 If module not provided, resolve from Tenant Type
    if (!resolvedModule) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: req.user.tenantId },
        select: { tenantType: true },
      });

      if (tenant) {
        resolvedModule = tenant.tenantType === 'GYM' ? 'GYM' : 'MOBILE_SHOP';
      } else {
        resolvedModule = 'MOBILE_SHOP'; // Fallback
      }
    }

    const sub = await this.subscriptionsService.getCurrentActiveSubscription(
      req.user.tenantId,
      resolvedModule,
    );
    const upcoming = await this.subscriptionsService.getUpcomingSubscription(
      req.user.tenantId,
      resolvedModule,
    );

    // No active subscription → trial
    if (!sub) {
      return {
        plan: 'GYM_TRIAL',
        planLevel: 0,
        daysLeft: 0,
        isTrial: true,
        subscriptionStatus: 'TRIAL',
        canUpgrade: true,
        autoRenew: false,
        subscriptionId: null,
      };
    }

    const now = new Date();

    const daysLeft = Math.max(
      Math.ceil(
        (sub.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      ),
      0,
    );

    const subscriptionStatus: 'ACTIVE' | 'TRIAL' | 'EXPIRED' =
      sub.endDate < now
        ? 'EXPIRED'
        : sub.status === 'TRIAL'
          ? 'TRIAL'
          : 'ACTIVE';

    const plan = sub.plan;

    // 🚀 NEW: Database-driven plan details
    const planDetails = {
      name: plan.name,
      code: plan.code,
      level: plan.level,
      tagline: plan.tagline,
      description: plan.description,
      features: plan.planFeatures
        .filter((f) => f.enabled)
        .map((f) => f.feature),
      featuresJson: plan.featuresJson,

      // Limits from DB
      memberLimit: plan.maxMembers,
      maxStaff: plan.maxStaff,
      whatsappAllowed: plan.planFeatures.some(
        (f) => f.feature === 'WHATSAPP_UTILITY' && f.enabled,
      ),
      staffAllowed: plan.planFeatures.some(
        (f) => f.feature === 'STAFF' && f.enabled,
      ),
      attendanceAllowed: plan.planFeatures.some(
        (f) => f.feature === 'ATTENDANCE' && f.enabled,
      ),
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
    if (!req.user || !req.user.tenantId) {
      throw new UnauthorizedException('Authentication required');
    }

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
    },
    @Query('module') module?: ModuleType,
  ) {
    if (!req.user || !req.user.tenantId) {
      throw new UnauthorizedException('Authentication required');
    }

    const { newPlanId, newBillingCycle } = body;

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
      throw new BadRequestException(
        'No active subscription to upgrade. Please buy a plan first.',
      );
    }

    // 2️⃣ Call upgradePlan service
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
    @Body()
    body: {
      newPlanId: string;
      newBillingCycle?: BillingCycle;
    },
    @Query('module') module?: ModuleType,
  ) {
    if (!req.user || !req.user.tenantId) {
      throw new UnauthorizedException('Authentication required');
    }

    const { newPlanId, newBillingCycle } = body;

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
    });

    this.logger.log(
      `📉 Downgrade API: tenantId=${req.user.tenantId}, ` +
        `subscriptionId=${downgraded.id}, newPlanId=${newPlanId}`,
    );

    return {
      success: true,
      subscriptionId: downgraded.id,
      nextPlanId: downgraded.nextPlanId,
      message: 'Plan downgrade scheduled. Changes apply at next renewal.',
    };
  }

  /**
   * Pre-check if downgrade is allowed
   * TODO: Implement after downgradeSubscription method is added
   */
  @Get('downgrade-check')
  async checkDowngrade(
    @Req() req: any,
    @Query('targetPlan') targetPlanId: string,
    @Query('module') module?: ModuleType,
  ) {
    if (!req.user || !req.user.tenantId) {
      throw new UnauthorizedException('Authentication required');
    }

    if (!targetPlanId) {
      throw new BadRequestException('targetPlan query parameter is required');
    }

    // Resolve module
    let resolvedModule = module;
    if (!resolvedModule) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: req.user.tenantId },
        select: { tenantType: true },
      });
      resolvedModule = tenant?.tenantType === 'GYM' ? 'GYM' : 'MOBILE_SHOP';
    }

    return this.subscriptionsService.checkDowngradeEligibility(
      req.user.tenantId,
      targetPlanId,
      resolvedModule,
    );
  }
}
