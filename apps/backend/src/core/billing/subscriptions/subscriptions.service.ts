/**
 * CONSOLIDATED SUBSCRIPTIONS SERVICE (V1 - Phase 1)
 *
 * Unified service combining:
 * - Phase 1 new billing methods (buyPlan, renewSubscription, upgradePlan, downgradeScheduled, toggleAutoRenew)
 * - Legacy support methods (getCurrentActiveSubscription, assignTrialSubscription)
 * - Admin methods (getSubscriptionByTenant, extendTrial, changePlan, changeStatus)
 *
 * This is the PRIMARY subscription service. Use this for all subscription operations.
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../cache/cache.service';
import {
  SubscriptionStatus,
  ModuleType,
  BillingCycle,
  TenantSubscription,
  UserRole,
} from '@prisma/client';
import { PlanPriceService } from '../plan-price.service';
import { addMonths, addYears } from 'date-fns';

// ============================================================================
// PHASE 1 INTERFACES
// ============================================================================

export interface BuyPlanInput {
  tenantId: string;
  planId: string;
  module: ModuleType;
  billingCycle: BillingCycle;
  startDate?: Date;
  autoRenew?: boolean;
}

export interface UpgradePlanInput {
  subscriptionId: string;
  newPlanId: string;
  newBillingCycle?: BillingCycle;
}

export interface DowngradePlanInput {
  subscriptionId: string;
  newPlanId: string;
  newBillingCycle?: BillingCycle;
}

export interface AddAddonInput {
  subscriptionId: string;
  addonPlanId: string;
  billingCycle: BillingCycle;
  autoRenew?: boolean;
}

// ============================================================================
// SERVICE
// ============================================================================

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly planPriceService: PlanPriceService,
    private readonly cacheService: CacheService,
  ) {}

  // =========================================================================
  // PHASE 1 METHODS (NEW BILLING SYSTEM)
  // =========================================================================

  /**
   * Calculate end date based on billing cycle
   * Supports MONTHLY, QUARTERLY, YEARLY
   */
  private calculateEndDate(startDate: Date, billingCycle: BillingCycle): Date {
    switch (billingCycle) {
      case BillingCycle.MONTHLY:
        return addMonths(startDate, 1);
      case BillingCycle.QUARTERLY:
        return addMonths(startDate, 3);
      case BillingCycle.YEARLY:
        return addYears(startDate, 1);
      default:
        throw new BadRequestException(`Invalid billingCycle: ${billingCycle}`);
    }
  }

  /**
   * BUY PLAN (Phase 1 - New Implementation)
   *
   * Creates a new subscription with:
   * - Explicit billingCycle chosen by user
   * - Price snapshotted from PlanPrice table
   * - Auto-renew disabled by default (user-controlled)
   *
   * Handles:
   * - Trial → Paid upgrade (end trial immediately)
   * - Existing subscription → No (error if already active)
   * - Multiple subscriptions → Not allowed (unique per module)
   */
  async buyPlanPhase1(input: BuyPlanInput): Promise<TenantSubscription> {
    const {
      tenantId,
      planId,
      module,
      billingCycle,
      startDate = new Date(),
      autoRenew = false,
    } = input;

    // Validate tenant exists
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true },
    });
    if (!tenant) {
      throw new NotFoundException(`Tenant not found: ${tenantId}`);
    }

    // Validate plan exists
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
      select: { id: true, name: true, isActive: true },
    });
    if (!plan || !plan.isActive) {
      throw new BadRequestException(`Plan not found or inactive: ${planId}`);
    }

    // Get price for this plan + billingCycle combo
    const priceResponse = await this.planPriceService.getPlanPrice({
      planId,
      billingCycle,
    });

    // Check for existing subscription
    const existingSub = await this.prisma.tenantSubscription.findUnique({
      where: { tenantId_module: { tenantId, module } },
      select: {
        id: true,
        status: true,
        endDate: true,
      },
    });

    let subscription: TenantSubscription;

    if (existingSub) {
      // End trial or expired subscription → UPGRADE
      if (
        existingSub.status === SubscriptionStatus.TRIAL ||
        existingSub.status === SubscriptionStatus.EXPIRED ||
        (existingSub.status === SubscriptionStatus.ACTIVE &&
          existingSub.endDate < new Date())
      ) {
        // Update existing subscription row
        subscription = await this.prisma.tenantSubscription.update({
          where: { id: existingSub.id },
          data: {
            planId,
            billingCycle,
            priceSnapshot: priceResponse.price,
            autoRenew,
            status: SubscriptionStatus.ACTIVE,
            startDate,
            endDate: this.calculateEndDate(startDate, billingCycle),
            expiryReminderSentAt: null,
            nextPlanId: null,
            nextBillingCycle: null,
            nextPriceSnapshot: null,
            lastRenewedAt: null,
          },
        });

        this.logger.log(
          `✅ Upgraded ${tenant.name}@${module} from ${existingSub.status} → ` +
            `${plan.name}@${billingCycle} (₹${priceResponse.price / 100})`,
        );
      } else if (existingSub.status === SubscriptionStatus.ACTIVE) {
        // Active subscription with time remaining → AUTO-UPGRADE (IDEMPOTENT)
        // This happens after payment success → must NOT throw
        this.logger.log(
          `🔄 Auto-upgrading ${tenant.name}@${module}: detected ACTIVE subscription, ` +
            `calling upgradePlan(subscriptionId=${existingSub.id}, newPlanId=${planId})`,
        );

        subscription = await this.upgradePlan({
          subscriptionId: existingSub.id,
          newPlanId: planId,
        });

        this.logger.log(
          `✅ Auto-upgrade complete: ${tenant.name}@${module} → ${plan.name}`,
        );
      } else {
        // CANCELLED, SCHEDULED → ERROR
        throw new BadRequestException(
          `Cannot buy plan: subscription is ${existingSub.status}`,
        );
      }
    } else {
      // No existing subscription → CREATE NEW
      subscription = await this.prisma.tenantSubscription.create({
        data: {
          tenantId,
          planId,
          module,
          billingCycle,
          priceSnapshot: priceResponse.price,
          autoRenew,
          status: SubscriptionStatus.ACTIVE,
          startDate,
          endDate: this.calculateEndDate(startDate, billingCycle),
        },
      });

      this.logger.log(
        `✅ Created subscription ${tenant.name}@${module}: ` +
          `${plan.name}@${billingCycle} (₹${priceResponse.price / 100})`,
      );
    }

    return subscription;
  }

  /**
   * UPGRADE PLAN (Immediate)
   *
   * Rules:
   * - Upgrade is IMMEDIATE (features active now)
   * - Current billing cycle continues unchanged
   * - New price applies at NEXT RENEWAL ONLY
   * - Can upgrade to same level (duration change not supported yet)
   *
   * Implementation:
   * - Update planId, nextPriceSnapshot
   * - Keep current endDate
   * - Log as "nextPrice" to distinguish from priceSnapshot
   */
  async upgradePlan(input: UpgradePlanInput): Promise<TenantSubscription> {
    const { subscriptionId, newPlanId } = input;

    // Get current subscription
    const subscription = await this.prisma.tenantSubscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: true, tenant: true },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription not found: ${subscriptionId}`);
    }

    if (subscription.status !== SubscriptionStatus.ACTIVE) {
      throw new BadRequestException(
        `Cannot upgrade non-ACTIVE subscription (status: ${subscription.status})`,
      );
    }

    // Get new plan
    const newPlan = await this.prisma.plan.findUnique({
      where: { id: newPlanId },
      select: { id: true, name: true, isActive: true },
    });

    if (!newPlan || !newPlan.isActive) {
      throw new BadRequestException(
        `New plan not found or inactive: ${newPlanId}`,
      );
    }

    // Get price for next renewal
    // Use new billing cycle if provided, otherwise stick to current
    const targetCycle = input.newBillingCycle || subscription.billingCycle!;
    const nextPrice = await this.planPriceService.getPlanPrice({
      planId: newPlanId,
      billingCycle: targetCycle,
    });

    // UPDATE: Change plan immediately, queue price for renewal
    const upgraded = await this.prisma.tenantSubscription.update({
      where: { id: subscriptionId },
      data: {
        planId: newPlanId,
        nextBillingCycle: input.newBillingCycle || subscription.billingCycle,
        // Keep current cycle, update price for next cycle
        nextPriceSnapshot: nextPrice.price,
        updatedAt: new Date(),
      },
    });

    this.logger.log(
      `⬆️ Upgraded ${subscription.tenant.name}@${subscription.module}: ` +
        `${subscription.plan.name} → ${newPlan.name} (immediate). ` +
        `Next renewal will use ₹${nextPrice.price / 100} price.`,
    );

    return upgraded;
  }

  /**
   * DOWNGRADE PLAN (Scheduled)
   *
   * Rules:
   * - Downgrade is SCHEDULED for next renewal only
   * - Current plan and price continue until endDate
   * - New plan + price apply at renewal
   *
   * Implementation:
   * - Set nextPlanId, nextPriceSnapshot
   * - Keep current planId, endDate, priceSnapshot
   * - On renewal, swap: planId ← nextPlanId, priceSnapshot ← nextPriceSnapshot
   */
  async downgradeScheduled(
    input: DowngradePlanInput,
  ): Promise<TenantSubscription> {
    const { subscriptionId, newPlanId } = input;

    // Get current subscription
    const subscription = await this.prisma.tenantSubscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: true, tenant: true },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription not found: ${subscriptionId}`);
    }

    if (subscription.status !== SubscriptionStatus.ACTIVE) {
      throw new BadRequestException(
        `Cannot downgrade non-ACTIVE subscription (status: ${subscription.status})`,
      );
    }

    // Get new plan
    const newPlan = await this.prisma.plan.findUnique({
      where: { id: newPlanId },
      select: { id: true, name: true, isActive: true, level: true, code: true },
    });

    if (!newPlan || !newPlan.isActive) {
      throw new BadRequestException(
        `New plan not found or inactive: ${newPlanId}`,
      );
    }

    // Get price for next renewal
    const targetCycle = input.newBillingCycle || subscription.billingCycle!;
    const nextPrice = await this.planPriceService.getPlanPrice({
      planId: newPlanId,
      billingCycle: targetCycle,
    });

    // ───────────────────────────────────────────────
    // 🛡️ PLAN LIMITS ENFORCEMENT (Downgrade Safety)
    // ───────────────────────────────────────────────
    const eligibility = await this.checkDowngradeEligibility(
      subscription.tenantId,
      newPlanId,
      subscription.module,
    );

    if (!eligibility.isEligible) {
      throw new BadRequestException(
        `Cannot downgrade to ${newPlan.name}: ${eligibility.blockers.join(' ')}`,
      );
    }

    // SCHEDULE downgrade: Set next* fields
    const scheduled = await this.prisma.tenantSubscription.update({
      where: { id: subscriptionId },
      data: {
        nextPlanId: newPlanId,
        nextBillingCycle: targetCycle,
        nextPriceSnapshot: nextPrice.price,
        updatedAt: new Date(),
      },
    });

    this.logger.log(
      `📉 Scheduled downgrade ${subscription.tenant.name}@${subscription.module}: ` +
        `${subscription.plan.name} → ${newPlan.name} at next renewal. ` +
        `(Scheduled price: ₹${nextPrice.price / 100})`,
    );

    return scheduled;
  }

  /**
   * RENEW SUBSCRIPTION (Auto or Manual)
   *
   * Rules:
   * - Uses priceSnapshot if no scheduled changes
   * - Uses nextPlanId + nextPriceSnapshot if downgrade scheduled
   * - Creates new TenantSubscription row (one per cycle)
   * - Old subscription marked as EXPIRED
   * - Resets expiryReminderSentAt
   *
   * Called by:
   * - Auto-renew cron job
   * - Manual renewal endpoint (user clicks "renew")
   */
  async renewSubscription(subscriptionId: string): Promise<TenantSubscription> {
    // Get current subscription
    const current = await this.prisma.tenantSubscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: true, tenant: true },
    });

    if (!current) {
      throw new NotFoundException(`Subscription not found: ${subscriptionId}`);
    }

    if (current.status !== SubscriptionStatus.ACTIVE) {
      throw new BadRequestException(
        `Cannot renew non-ACTIVE subscription (status: ${current.status})`,
      );
    }

    // Determine next plan and price
    const nextPlanId = current.nextPlanId || current.planId;
    const nextBillingCycle = current.nextBillingCycle || current.billingCycle;
    const nextPriceSnapshot =
      current.nextPriceSnapshot ?? current.priceSnapshot;

    if (!nextPlanId || !nextBillingCycle || nextPriceSnapshot === null) {
      throw new BadRequestException(
        'Subscription missing required renewal fields',
      );
    }

    // Calculate dates for new cycle
    const newStartDate = new Date();
    const newEndDate = this.calculateEndDate(newStartDate, nextBillingCycle);

    // Create new subscription row
    const renewed = await this.prisma.tenantSubscription.create({
      data: {
        tenantId: current.tenantId,
        planId: nextPlanId,
        module: current.module,
        billingCycle: nextBillingCycle,
        priceSnapshot: nextPriceSnapshot,
        autoRenew: current.autoRenew,
        status: SubscriptionStatus.ACTIVE,
        startDate: newStartDate,
        endDate: newEndDate,
        lastRenewedAt: new Date(),
      },
    });

    // Mark old subscription as EXPIRED
    await this.prisma.tenantSubscription.update({
      where: { id: subscriptionId },
      data: {
        status: SubscriptionStatus.EXPIRED,
        updatedAt: new Date(),
      },
    });

    // Migrate active add-ons to new subscription row
    await this.prisma.subscriptionAddon.updateMany({
      where: {
        subscriptionId: subscriptionId,
        status: SubscriptionStatus.ACTIVE,
      },
      data: {
        subscriptionId: renewed.id,
      },
    });

    this.logger.log(
      `🔄 Renewed ${current.tenant.name}@${current.module}: ` +
        `${current.plan.name} → ${(await this.prisma.plan.findUnique({ where: { id: nextPlanId }, select: { name: true } }))?.name} ` +
        `@ ${nextBillingCycle} (₹${nextPriceSnapshot / 100})`,
    );

    return renewed;
  }

  /**
   * BUY ADDON (Phase 1 - New Implementation)
   *
   * Attaches an addon to an existing subscription.
   * Addons are co-terminus with the main subscription.
   */
  async buyAddon(input: AddAddonInput): Promise<any> {
    const { subscriptionId, addonPlanId, billingCycle, autoRenew } = input;

    // 1. Find parent subscription
    const parentSub = await this.prisma.tenantSubscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!parentSub) {
      throw new NotFoundException(`Subscription ${subscriptionId} not found`);
    }

    // 2. Verify addon plan
    const addonPlan = await this.prisma.plan.findUnique({
      where: { id: addonPlanId },
    });

    if (!addonPlan || !addonPlan.isAddon) {
      throw new BadRequestException(
        `Plan ${addonPlanId} is not a valid addon plan`,
      );
    }

    // 3. co-terminus: Addon expires with the parent subscription
    const endDate = parentSub.endDate;

    this.logger.log(
      `🛒 Buying addon ${addonPlan.name} for sub ${subscriptionId}. Co-terminus expiry: ${endDate}`,
    );

    // 4. Upsert addon record
    return this.prisma.subscriptionAddon.upsert({
      where: {
        subscriptionId_addonPlanId: {
          subscriptionId,
          addonPlanId,
        },
      },
      update: {
        status: SubscriptionStatus.ACTIVE,
        endDate: endDate,
        billingCycle,
        autoRenew: autoRenew ?? true,
      },
      create: {
        subscriptionId,
        addonPlanId,
        status: SubscriptionStatus.ACTIVE,
        startDate: new Date(),
        endDate: endDate,
        billingCycle,
        autoRenew: autoRenew ?? true,
      },
    });
  }


  /**
   * TOGGLE AUTO-RENEW
   *
   * User can disable auto-renewal at any time.
   * Subscription continues until endDate, then expires (no renewal).
   *
   * If disabled and then re-enabled:
   * - Subscription must not be past endDate
   * - Re-enable will trigger renewal at next cron
   */
  async toggleAutoRenew(
    subscriptionId: string,
    enabled: boolean,
  ): Promise<TenantSubscription> {
    const subscription = await this.prisma.tenantSubscription.findUnique({
      where: { id: subscriptionId },
      include: { tenant: true },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription not found: ${subscriptionId}`);
    }

    if (subscription.status !== SubscriptionStatus.ACTIVE) {
      throw new BadRequestException(
        `Cannot toggle auto-renew for non-ACTIVE subscription`,
      );
    }

    const updated = await this.prisma.tenantSubscription.update({
      where: { id: subscriptionId },
      data: {
        autoRenew: enabled,
        updatedAt: new Date(),
      },
    });

    this.logger.log(
      `⚙️ Auto-renew for ${subscription.tenant.name} set to: ${enabled}`,
    );

    return updated;
  }

  /**
   * Get current active subscription (if exists and not expired)
   */
  async getActiveSubscription(
    tenantId: string,
    module: ModuleType,
  ): Promise<TenantSubscription | null> {
    const subscription = await this.prisma.tenantSubscription.findUnique({
      where: { tenantId_module: { tenantId, module } },
    });

    if (!subscription) {
      return null;
    }

    // Check if ACTIVE and not expired
    if (
      subscription.status === SubscriptionStatus.ACTIVE &&
      subscription.endDate > new Date()
    ) {
      return subscription;
    }

    return null;
  }

  // =========================================================================
  // LEGACY SUPPORT METHODS (For backward compatibility)
  // =========================================================================

  /**
   * Get current active subscription with plan details
   * Automatically promotes SCHEDULED to ACTIVE if time reached
   * ⚡ CACHED: 5 minutes TTL (invalidate on buyPlan, upgradePlan, changePlan, changeStatus)
   */
  async getCurrentActiveSubscription(tenantId: string, module: ModuleType) {
    const cacheKey = `subscription:${tenantId}:${module}`;

    return this.cacheService.getOrSet(
      cacheKey,
      async () => this._fetchActiveSubscription(tenantId, module),
      5 * 60 * 1000, // 5 minutes
    );
  }

  /**
   * Internal method for fetching subscription (used by cache)
   */
  private async _fetchActiveSubscription(tenantId: string, module: ModuleType) {
    const now = new Date();

    // 1️⃣ Promote scheduled → active if time reached
    const scheduled = await this.prisma.tenantSubscription.findFirst({
      where: {
        tenantId,
        module,
        status: SubscriptionStatus.SCHEDULED,
        startDate: { lte: now },
      },
      orderBy: { startDate: 'asc' },
    });

    if (scheduled) {
      await this.prisma.tenantSubscription.update({
        where: { id: scheduled.id },
        data: { status: SubscriptionStatus.ACTIVE },
      });
    }

    // 2️⃣ Prefer ACTIVE over TRIAL
    const active = await this.prisma.tenantSubscription.findFirst({
      where: {
        tenantId,
        module,
        status: SubscriptionStatus.ACTIVE,
        startDate: { lte: now },
        endDate: { gt: now },
      },
      include: {
        plan: { include: { planFeatures: true } },
        addons: {
          where: { status: SubscriptionStatus.ACTIVE },
          include: { addonPlan: { include: { planFeatures: true } } },
        },
      },
      orderBy: { startDate: 'desc' },
    });

    if (active) return active;

    // 3️⃣ Fallback to TRIAL
    return this.prisma.tenantSubscription.findFirst({
      where: {
        tenantId,
        module,
        status: SubscriptionStatus.TRIAL,
        startDate: { lte: now },
        endDate: { gt: now },
      },
      include: {
        plan: { include: { planFeatures: true } },
        addons: {
          where: { status: SubscriptionStatus.ACTIVE },
          include: { addonPlan: { include: { planFeatures: true } } },
        },
      },
      orderBy: { startDate: 'desc' },
    });
  }

  /**
   * Assign trial subscription to a new tenant
   * Trial duration: 14 days
   */
  async assignTrialSubscription(
    tenantId: string,
    planId: string,
    module: ModuleType,
  ) {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 14);

    return this.prisma.tenantSubscription.create({
      data: {
        tenantId,
        planId,
        module,
        status: SubscriptionStatus.TRIAL,
        startDate,
        endDate,
      },
    });
  }

  /**
   * Get subscription by tenant (most recent)
   */
  async getSubscriptionByTenant(tenantId: string, module: ModuleType) {
    return this.prisma.tenantSubscription.findFirst({
      where: {
        tenantId,
        module,
      },
      orderBy: {
        startDate: 'desc',
      },
      include: {
        plan: true,
      },
    });
  }

  /**
   * Extend trial by extra days
   */
  async extendTrial(tenantId: string, extraDays: number, module: ModuleType) {
    const sub = await this.getSubscriptionByTenant(tenantId, module);
    if (!sub) return null;

    const newEndDate = new Date(sub.endDate);
    newEndDate.setDate(newEndDate.getDate() + extraDays);

    return this.prisma.tenantSubscription.update({
      where: { id: sub.id },
      data: {
        endDate: newEndDate,
        status: SubscriptionStatus.TRIAL,
      },
    });
  }

  /**
   * Change plan by name
   */
  async changePlan(tenantId: string, planName: string, module: ModuleType) {
    // 1️⃣ Find plan
    const plan = await this.prisma.plan.findFirst({
      where: {
        name: planName,
        isActive: true,
      },
    });

    if (!plan) {
      throw new BadRequestException('Invalid or inactive plan');
    }

    // 2️⃣ Calculate new dates
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + 30); // Default 30 days

    // 3️⃣ Update subscription
    const currentSub = await this.getCurrentActiveSubscription(
      tenantId,
      module,
    );
    if (!currentSub) {
      throw new NotFoundException('Active subscription not found');
    }
    return this.prisma.tenantSubscription.update({
      where: { id: currentSub.id },
      data: {
        planId: plan.id,
        status: SubscriptionStatus.ACTIVE,
        startDate,
        endDate,
        expiryReminderSentAt: null,
      },
    });
  }

  /**
   * Get active subscription by tenant with plan details
   */
  async getActiveSubscriptionByTenant(tenantId: string, module: ModuleType) {
    return this.prisma.tenantSubscription.findFirst({
      where: {
        tenantId,
        module,
        status: SubscriptionStatus.ACTIVE,
      },
      include: {
        plan: true,
      },
    });
  }

  /**
   * Change subscription status
   */
  async changeStatus(
    tenantId: string,
    status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED',
    module: ModuleType,
  ) {
    const currentSub = await this.getCurrentActiveSubscription(
      tenantId,
      module,
    );
    if (!currentSub) {
      throw new NotFoundException('Active subscription not found');
    }

    return this.prisma.tenantSubscription.update({
      where: { id: currentSub.id },
      data: { status: status as SubscriptionStatus },
    });
  }

  /**
   * Get upcoming subscription
   */
  async getUpcomingSubscription(tenantId: string, module: ModuleType) {
    return this.prisma.tenantSubscription.findFirst({
      where: {
        tenantId,
        module,
        status: SubscriptionStatus.SCHEDULED,
        startDate: { gt: new Date() },
      },
      orderBy: { startDate: 'asc' },
      include: { plan: true },
    });
  }

  /**
   * CHECK DOWNGRADE ELIGIBILITY
   *
   * Checks if a tenant can downgrade to a specific plan based on their current usage.
   * Returns a list of blockers (e.g., "Too many staff members").
   */
  async checkDowngradeEligibility(
    tenantId: string,
    targetPlanId: string,
    module: ModuleType,
  ) {
    const targetPlan = await this.prisma.plan.findUnique({
      where: { id: targetPlanId },
      include: { planFeatures: true },
    });

    if (!targetPlan) {
      throw new NotFoundException('Target plan not found');
    }

    const blockers: string[] = [];

    // 1. Check Staff Limit
    if (targetPlan.maxStaff !== null) {
      const currentStaffCount = await this.prisma.userTenant.count({
        where: {
          tenantId,
          role: UserRole.STAFF,
        },
      });

      if (currentStaffCount > targetPlan.maxStaff) {
        blockers.push(
          `You have ${currentStaffCount} staff members, but the ${targetPlan.name} plan only allows ${targetPlan.maxStaff}. Please remove ${currentStaffCount - targetPlan.maxStaff} staff member(s) first.`,
        );
      }
    }

    // 2. Check Member Limit (GYM Only)
    if (module === ModuleType.GYM && targetPlan.maxMembers !== null) {
      const currentMemberCount = await this.prisma.member.count({
        where: {
          tenantId,
          isActive: true,
        },
      });

      if (currentMemberCount > targetPlan.maxMembers) {
        blockers.push(
          `You have ${currentMemberCount} active members, but the ${targetPlan.name} plan only allows ${targetPlan.maxMembers}. Please deactivate ${currentMemberCount - targetPlan.maxMembers} member(s) first.`,
        );
      }
    }

    // 3. Check Shop Limit (Mobile Shop)
    if (targetPlan.maxShops !== null) {
      const currentShopCount = await this.prisma.shop.count({
        where: {
          tenantId,
          isActive: true,
        },
      });

      if (currentShopCount > targetPlan.maxShops) {
        blockers.push(
          `You have ${currentShopCount} active shops, but the ${targetPlan.name} plan only allows ${targetPlan.maxShops}. Please deactivate ${currentShopCount - targetPlan.maxShops} shop(s) first.`,
        );
      }
    }

    // 4. Check WhatsApp Feature (Warning Only - or Blocker if strict)
    // For now, we just check if they lose WhatsApp Access
    const hasWhatsapp = targetPlan.planFeatures.some(
      (f) => f.feature === 'WHATSAPP_UTILITY' && f.enabled,
    );

    // We can also check usage, but `checkDowngradeEligibility` logic
    // primarily focuses on HARD LIMITS (counts). Feature loss is usually a warning.
    // We'll return it as a structured warning if needed, but for now blockers are strings.
    // Let's add it as a "blocker" ONLY if they have active WhatsApp usage?
    // No, usually features are just disabled. We'll stick to Counts for blockers.

    return {
      isEligible: blockers.length === 0,
      blockers,
      currentUsage: {
        staff: await this.prisma.userTenant.count({
          where: { tenantId, role: UserRole.STAFF },
        }),
        members:
          module === ModuleType.GYM
            ? await this.prisma.member.count({
                where: { tenantId, isActive: true },
              })
            : null,
        shops: await this.prisma.shop.count({
          where: { tenantId, isActive: true },
        }),
      },
      limits: {
        maxStaff: targetPlan.maxStaff,
        maxMembers: targetPlan.maxMembers,
        maxShops: targetPlan.maxShops,
      },
    };
  }

  async manageAddon(
    tenantId: string,
    action: 'ENABLE' | 'DISABLE',
    planId?: string,
    module?: ModuleType,
  ) {
    // 1. Resolve module if not provided or if it's an addon-only module
    let resolvedModule = module;
    if (!resolvedModule || resolvedModule === ModuleType.WHATSAPP_CRM) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { tenantType: true },
      });
      resolvedModule =
        tenant?.tenantType === 'GYM' ? ModuleType.GYM : ModuleType.MOBILE_SHOP;
    }

    // 2. Resolve target subscription
    const currentSub = await this.getCurrentActiveSubscription(
      tenantId,
      resolvedModule,
    );
    if (!currentSub) {
      throw new BadRequestException(
        'No active subscription found to manage addons.',
      );
    }

    if (action === 'ENABLE') {
      if (!planId) {
        throw new BadRequestException('planId is required to enable addon');
      }

      const addon = await this.buyAddon({
        subscriptionId: currentSub.id,
        addonPlanId: planId,
        billingCycle: currentSub.billingCycle || BillingCycle.MONTHLY, // Inherit from parent
        autoRenew: true,
      });

      // Special handling for legacy flags if plan is WhatsApp CRM
      const plan = await this.prisma.plan.findUnique({ where: { id: planId } });
      if (plan?.module === ModuleType.WHATSAPP_CRM) {
        await this.prisma.tenant.update({
          where: { id: tenantId },
          data: {
            whatsappCrmEnabled: true,
            // Only set default if not already set
            whatsappPhoneNumberId: {
              set: (await this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { whatsappPhoneNumberId: true } }))?.whatsappPhoneNumberId || '100609346426084'
            }
          },
        });
      }

      return addon;
    } else {
      // DISABLE
      if (!planId) {
        throw new BadRequestException('planId is required to disable addon');
      }

      const updated = await this.prisma.subscriptionAddon.update({
        where: {
          subscriptionId_addonPlanId: {
            subscriptionId: currentSub.id,
            addonPlanId: planId,
          },
        },
        data: { status: SubscriptionStatus.CANCELLED },
      });

      // Special handling for legacy flags
      const plan = await this.prisma.plan.findUnique({ where: { id: planId } });
      if (plan?.module === ModuleType.WHATSAPP_CRM) {
        await this.prisma.tenant.update({
          where: { id: tenantId },
          data: { whatsappCrmEnabled: false },
        });
      }

      return updated;
    }
  }
}

