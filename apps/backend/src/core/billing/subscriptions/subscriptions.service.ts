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
import {
  SubscriptionStatus,
  ModuleType,
  BillingCycle,
  TenantSubscription,
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
}

export interface DowngradePlanInput {
  subscriptionId: string;
  newPlanId: string;
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
   * - Auto-renew enabled by default
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
      autoRenew = true,
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
        // Active subscription with time remaining → ERROR
        throw new BadRequestException(
          `Tenant already has an ACTIVE subscription for ${module}. ` +
            `Upgrade via upgradePlan() or downgrade via downgradeScheduled().`,
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
    // Use existing billingCycle so price applies at next renewal
    const nextPrice = await this.planPriceService.getPlanPrice({
      planId: newPlanId,
      billingCycle: subscription.billingCycle!,
    });

    // UPDATE: Change plan immediately, queue price for renewal
    const upgraded = await this.prisma.tenantSubscription.update({
      where: { id: subscriptionId },
      data: {
        planId: newPlanId,
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
      select: { id: true, name: true, isActive: true, level: true },
    });

    if (!newPlan || !newPlan.isActive) {
      throw new BadRequestException(
        `New plan not found or inactive: ${newPlanId}`,
      );
    }

    // Get price for next renewal
    const nextPrice = await this.planPriceService.getPlanPrice({
      planId: newPlanId,
      billingCycle: subscription.billingCycle!,
    });

    // SCHEDULE downgrade: Set next* fields
    const scheduled = await this.prisma.tenantSubscription.update({
      where: { id: subscriptionId },
      data: {
        nextPlanId: newPlanId,
        nextBillingCycle: subscription.billingCycle,
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

    this.logger.log(
      `🔄 Renewed ${current.tenant.name}@${current.module}: ` +
        `${current.plan.name} → ${(await this.prisma.plan.findUnique({ where: { id: nextPlanId }, select: { name: true } }))?.name} ` +
        `@ ${nextBillingCycle} (₹${nextPriceSnapshot / 100})`,
    );

    return renewed;
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
   */
  async getCurrentActiveSubscription(tenantId: string, module: ModuleType) {
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
      include: { plan: true },
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
      include: { plan: true },
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
}
