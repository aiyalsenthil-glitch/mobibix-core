import { PaymentGatewayService } from '../payment-gateway.service'; // REMOVED
import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter } from 'prom-client';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../cache/cache.service';
import {
  SubscriptionStatus,
  ModuleType,
  BillingCycle,
  TenantSubscription,
  UserRole,
  BillingType,
  PaymentStatus,
  AutopayStatus,
} from '@prisma/client';
import { RazorpayService } from '../REMOVED_PAYMENT_INFRA.service';
import { PlanPriceService } from '../plan-price.service';
import { addMonths, addYears } from 'date-fns';
import { SOFT_GRACE_PERIOD_DAYS } from '../grace-period.constants';

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
  billingType?: BillingType;
  initialStatus?: SubscriptionStatus; // Force an initial status (e.g. ACTIVE)
  skipExternalPayment?: boolean; // Skip Razorpay link generation
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
  immediate?: boolean; // If true, downgrade happens immediately instead of scheduling
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
    // private readonly paymentGatewayService: PaymentGatewayService,
    private readonly REMOVED_PAYMENT_INFRAService: RazorpayService,
    private readonly eventEmitter: EventEmitter2,
    @InjectMetric('renewals_success_total')
    private readonly renewalsSuccessCounter: Counter<string>,
    @InjectMetric('renewals_failed_total')
    private readonly renewalsFailedCounter: Counter<string>,
  ) {}

  // =========================================================================
  // PHASE 1 METHODS (NEW BILLING SYSTEM)
  // =========================================================================

  /**
   * Calculate end date based on billing cycle
   * Supports MONTHLY, QUARTERLY, YEARLY
   */
  public calculateEndDate(startDate: Date, billingCycle: BillingCycle): Date {
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
  async buyPlanPhase1(
    input: BuyPlanInput,
  ): Promise<
    TenantSubscription & { paymentLink?: string; subscriptionId?: string }
  > {
    const {
      tenantId,
      planId,
      module,
      billingCycle,
      startDate = new Date(),
      autoRenew = false,
      billingType = BillingType.MANUAL,
      initialStatus: forcedStatus,
      skipExternalPayment = false,
    } = input;

    // Validate tenant exists
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        contactEmail: true,
        contactPhone: true,
        currency: true,
      }, // Added contact + currency
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

    // Get price for this plan + billingCycle + currency combo
    const priceResponse = await this.planPriceService.getPlanPrice({
      planId,
      billingCycle,
      currency: tenant.currency || 'INR',
    });

    // C-2: Check for any live subscription (including PAST_DUE and PENDING).
    // Previously only checked ACTIVE/TRIAL — a PAST_DUE sub was invisible here,
    // so buyPlanPhase1 created a new row. When the concurrent autopay charge then
    // processed the original PAST_DUE row, both rows became ACTIVE simultaneously.
    const existingSub = await this.prisma.tenantSubscription.findFirst({
      where: {
        tenantId,
        module,
        status: { in: ['ACTIVE', 'TRIAL', 'PAST_DUE', 'PENDING'] },
      },
      select: {
        id: true,
        status: true,
        endDate: true,
      },
    });

    if (existingSub) {
      if (
        existingSub.status === SubscriptionStatus.ACTIVE &&
        existingSub.endDate > new Date()
      ) {
        throw new BadRequestException(
          `Active subscription already exists. Use upgrade endpoint.`,
        );
      }
      // PAST_DUE, PENDING, or expired ACTIVE — fall through to update the existing row
    }

    // ───────────────────────────────────────────────
    // HYBRID BILLING LOGIC
    // ───────────────────────────────────────────────

    let providerPaymentLinkId: string | null = null;
    let providerSubscriptionId: string | null = null;
    let paymentLinkUrl: string | undefined;
    let REMOVED_PAYMENT_INFRASubscriptionId: string | undefined;

    // 1. MANUAL FLOW (Payment Link)
    if (billingType === BillingType.MANUAL && !skipExternalPayment) {
      if (priceResponse.price > 0) {
        // Create Razorpay Payment Link
        const link = await this.REMOVED_PAYMENT_INFRAService.createPaymentLink(
          priceResponse.price,
          priceResponse.currency,
          `Subscription for ${plan.name} (${billingCycle})`,
          {
            name: tenant.name,
            email: tenant.contactEmail || 'admin@mobibix.com',
            contact: tenant.contactPhone || '9999999999',
          },
          `sub_${tenantId}_${module}_${billingCycle}`, // L-3: deterministic ref prevents duplicate links on retry
          module,                                       // M-1: correct callback URL per vertical
          { tenantId, planId, module, billingCycle },   // C-3: notes for orphan payment recovery
        );
        providerPaymentLinkId = link.id;
        paymentLinkUrl = link.short_url;
      }
    }
    // 2. AUTOPAY FLOW (Subscription)
    else if (billingType === BillingType.AUTOPAY && !skipExternalPayment) {
      // Ensure PlanPrice has REMOVED_PAYMENT_INFRAPlanId
      if (!priceResponse.REMOVED_PAYMENT_INFRAPlanId) {
        throw new BadRequestException(
          `AutoPay not configured for this plan (${plan.name} - ${billingCycle})`,
        );
      }

      // Cancel any previous Razorpay subscription to prevent ghost mandates
      const previousAutopay = await this.prisma.tenantSubscription.findFirst({
        where: {
          tenantId,
          module,
          providerSubscriptionId: { not: null },
          status: { in: [SubscriptionStatus.EXPIRED, SubscriptionStatus.CANCELLED] },
          autopayStatus: { not: AutopayStatus.CANCELLED },
        },
        orderBy: { createdAt: 'desc' },
        select: { providerSubscriptionId: true },
      });
      if (previousAutopay?.providerSubscriptionId) {
        try {
          await this.REMOVED_PAYMENT_INFRAService.cancelSubscription(
            previousAutopay.providerSubscriptionId,
          );
          this.logger.log(
            `Cancelled previous Razorpay sub ${previousAutopay.providerSubscriptionId} before re-subscribe`,
          );
        } catch (cancelErr: any) {
          this.logger.warn(
            `Non-fatal: could not cancel old Razorpay sub ${previousAutopay.providerSubscriptionId}: ${cancelErr.message}`,
          );
        }
      }

      const sub = await this.REMOVED_PAYMENT_INFRAService.createSubscription(
        priceResponse.REMOVED_PAYMENT_INFRAPlanId,
        120, // 10 years default
        Math.floor(startDate.getTime() / 1000), // Start At timestamp (optional)
      );
      providerSubscriptionId = sub.id;
      REMOVED_PAYMENT_INFRASubscriptionId = sub.id;
    }

    // 3. Create/Update Subscription in DB
    // Use upsert or logic similar to previous implementation

    // Note: If existingSub found (Expired), update it. Else create new.
    // We are setting status to PENDING initially for paid plans.

    // Determine initial status
    const initialStatus =
      forcedStatus ||
      (priceResponse.price > 0
        ? SubscriptionStatus.PENDING
        : SubscriptionStatus.ACTIVE);
    const endDate = this.calculateEndDate(startDate, billingCycle);

    let subscription: TenantSubscription;

    if (existingSub) {
      subscription = await this.prisma.tenantSubscription.update({
        where: { id: existingSub.id },
        data: {
          planId,
          billingCycle,
          priceSnapshot: priceResponse.price,
          autoRenew: billingType === BillingType.AUTOPAY, // Force true for AutoPay
          // @ts-ignore
          billingType,
          paymentStatus: PaymentStatus.PENDING,
          providerPaymentLinkId,
          providerSubscriptionId,
          status: initialStatus,
          startDate,
          endDate,
          updatedAt: new Date(),
        },
      });
    } else {
      subscription = await this.prisma.tenantSubscription.create({
        data: {
          tenantId,
          planId,
          module,
          billingCycle,
          priceSnapshot: priceResponse.price,
          autoRenew: billingType === BillingType.AUTOPAY,
          billingType,
          paymentStatus: PaymentStatus.PENDING,
          providerPaymentLinkId,
          providerSubscriptionId,
          status: initialStatus,
          startDate,
          endDate,
        },
      });
    }

    this.logger.log(
      `🛒 Initiated purchase ${tenant.name}@${module}: ${billingType} | Status: ${initialStatus}`,
    );

    if (initialStatus === SubscriptionStatus.ACTIVE) {
      this.eventEmitter.emit('subscription.active', {
        tenantId,
        module,
        planId,
        expiryDate: endDate,
      });
    }

    // ⚡ Invalidate cache
    this.cacheService.delete(`subscription:${tenantId}:${module}`);

    return {
      ...subscription,
      paymentLink: paymentLinkUrl,
      subscriptionId: REMOVED_PAYMENT_INFRASubscriptionId,
    };
  }

  /**
   * Calculate prorated delta for mid-cycle upgrade (Second Precision)
   * Formula: (NewPrice - OldPrice) * (RemainingSeconds / TotalCycleSeconds)
   */
  public calculateProratedAmount(
    currentPrice: number,
    newPrice: number,
    startDate: Date,
    endDate: Date,
    now: Date = new Date(), // Allow injecting time for tests
  ): number {
    if (newPrice <= currentPrice) return 0;

    const totalSeconds = Math.max(
      1,
      Math.floor((endDate.getTime() - startDate.getTime()) / 1000),
    );
    const remainingSeconds = Math.max(
      0,
      Math.floor((endDate.getTime() - now.getTime()) / 1000),
    );

    if (remainingSeconds <= 0) return 0;

    const delta = newPrice - currentPrice;
    const proratedDelta = Math.round(delta * (remainingSeconds / totalSeconds));

    // 💰 Enforce ₹1 (100 paise) minimum charge rule
    // Never allow < 1 Rupee charge in Razorpay. If delta is > 0 but < 100 paise, force 100 paise.
    if (proratedDelta > 0 && proratedDelta < 100) {
      return 100;
    }

    return Math.max(0, proratedDelta);
  }

  /**
   * UPGRADE PLAN (Immediate)
   *
   * Rules:
   * - Upgrade is IMMEDIATE (features active now)
   * - Current billing cycle continues unchanged
   * - New price delta is charged IMMEDIATELY (Prorated)
   * - Full new price applies at NEXT RENEWAL
   *
   * Implementation:
   * - Calculate prorated delta using second-precision math
   * - Create Razorpay Payment Link for the delta
   * - Update planId immediately to grant features
   */
  async upgradePlan(
    input: UpgradePlanInput,
  ): Promise<TenantSubscription & { paymentLink?: string }> {
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

    // Get price for new plan (for current cycle duration)
    const targetCycle = input.newBillingCycle || subscription.billingCycle!;
    const newPriceResponse = await this.planPriceService.getPlanPrice({
      planId: newPlanId,
      billingCycle: targetCycle,
    });

    // 💰 CALCULATE PRORATED DELTA
    const proratedDelta = this.calculateProratedAmount(
      subscription.priceSnapshot || 0,
      newPriceResponse.price,
      subscription.startDate,
      subscription.endDate,
    );

    let paymentLink: string | undefined;

    // 💳 GENERATE PAYMENT LINK FOR DELTA
    if (proratedDelta > 0) {
      const link = await this.REMOVED_PAYMENT_INFRAService.createPaymentLink(
        proratedDelta,
        'INR',
        `Prorated Upgrade: ${subscription.plan.name} → ${newPlan.name}`,
        {
          name: subscription.tenant.name,
          email: subscription.tenant.contactEmail || 'admin@mobibix.com',
          contact: subscription.tenant.contactPhone || '9999999999',
        },
        `upgrade_${subscription.id}_${Date.now()}`,
        subscription.module, // M-1: correct callback URL per vertical
      );
      paymentLink = link.short_url;
    }

    // UPDATE: Change plan immediately, queue price for renewal
    const upgraded = await this.prisma.tenantSubscription.update({
      where: { id: subscriptionId },
      data: {
        planId: newPlanId,
        nextBillingCycle: input.newBillingCycle || subscription.billingCycle,
        // Keep current cycle, update price for next cycle
        nextPriceSnapshot: newPriceResponse.price,
        updatedAt: new Date(),
      },
    });

    this.logger.log(
      `⬆️ Upgraded ${subscription.tenant.name}@${subscription.module}: ` +
        `${subscription.plan.name} → ${newPlan.name} (immediate). ` +
        `Prorated Delta: ₹${proratedDelta / 100} | Next renewal price: ₹${newPriceResponse.price / 100}`,
    );

    // ⚡ Invalidate cache
    this.cacheService.delete(
      `subscription:${subscription.tenantId}:${subscription.module}`,
    );

    return {
      ...upgraded,
      paymentLink,
    };
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

    // If IMMEDIATE, update plan and status right away
    if (input.immediate) {
      const updated = await this.prisma.tenantSubscription.update({
        where: { id: subscriptionId },
        data: {
          planId: newPlanId,
          billingCycle: targetCycle,
          priceSnapshot: nextPrice.price,
          status: SubscriptionStatus.ACTIVE,
          updatedAt: new Date(),
          // Clear any scheduled changes
          nextPlanId: null,
          nextBillingCycle: null,
          nextPriceSnapshot: null,
        },
      });

      this.logger.log(
        `📉 Downgraded ${subscription.tenant.name}@${subscription.module} IMMEDIATELY: ` +
          `${subscription.plan.name} → ${newPlan.name}. ` +
          `New price: ₹${nextPrice.price / 100}`,
      );

      this.cacheService.delete(
        `subscription:${subscription.tenantId}:${subscription.module}`,
      );

      return updated;
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

    // ⚡ Invalidate cache
    this.cacheService.delete(
      `subscription:${subscription.tenantId}:${subscription.module}`,
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

    // Use transaction to avoid unique constraint violation on [tenantId, module]
    const renewed = await this.prisma.$transaction(async (tx) => {
      // 1. Mark old subscription as EXPIRED first to free up the unique constraint
      await tx.tenantSubscription.update({
        where: { id: subscriptionId },
        data: {
          status: SubscriptionStatus.EXPIRED,
          updatedAt: new Date(),
        },
      });

      // 2. Create new subscription row
      // FIX 1: Reset AI token quota on each new billing cycle
      // FIX 2: Preserve billingType + providerSubscriptionId (prevents AUTOPAY→MANUAL silent downgrade)
      return tx.tenantSubscription.create({
        data: {
          tenantId: current.tenantId,
          planId: nextPlanId,
          module: current.module,
          billingCycle: nextBillingCycle,
          priceSnapshot: nextPriceSnapshot,
          autoRenew: current.autoRenew,
          billingType: current.billingType ?? BillingType.MANUAL,           // FIX 2
          providerSubscriptionId: current.providerSubscriptionId ?? null,   // FIX 2
          status: SubscriptionStatus.ACTIVE,
          startDate: newStartDate,
          endDate: newEndDate,
          lastRenewedAt: new Date(),
          aiTokensUsed: 0,                                                   // FIX 1
          lastQuotaResetAt: new Date(),                                      // FIX 1
        },
      });
    });

    this.eventEmitter.emit('subscription.active', {
      tenantId: current.tenantId,
      module: current.module,
      planId: nextPlanId,
      expiryDate: newEndDate,
    });

    this.eventEmitter.emit('subscription.expired', {
      tenantId: current.tenantId,
      module: current.module,
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

    // ⚡ Invalidate cache
    this.cacheService.delete(
      `subscription:${current.tenantId}:${current.module}`,
    );

    this.renewalsSuccessCounter.inc({ planId: nextPlanId });

    return renewed;
  }

  /**
   * RENEW SUBSCRIPTION WITH PAYMENT (Secure Flow)
   *
   * 1. Verifies subscription status
   * 2. Calculates renewal amount
   * 3. Processes payment via PaymentGateway
   * 4. renews subscription on success
   */

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

    // 4. Get price for this addon
    const priceResponse = await this.planPriceService.getPlanPrice({
      planId: addonPlanId,
      billingCycle,
    });

    // 5. Upsert addon record
    const addon = await this.prisma.subscriptionAddon.upsert({
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
        priceSnapshot: priceResponse.price,
        autoRenew: autoRenew ?? true,
      },
      create: {
        subscriptionId,
        addonPlanId,
        status: SubscriptionStatus.ACTIVE,
        startDate: new Date(),
        endDate: endDate,
        billingCycle,
        priceSnapshot: priceResponse.price,
        autoRenew: autoRenew ?? true,
      },
    });

    // ⚡ Invalidate cache
    this.cacheService.delete(
      `subscription:${parentSub.tenantId}:${parentSub.module}`,
    );

    return addon;
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

    this.logger.log(
      `🔄 Toggling auto-renew for sub ${subscriptionId} (Tenant: ${subscription?.tenantId}) to ${enabled}`,
    );

    if (!subscription) {
      throw new NotFoundException(`Subscription not found: ${subscriptionId}`);
    }

    if (
      subscription.status !== SubscriptionStatus.ACTIVE &&
      subscription.status !== SubscriptionStatus.TRIAL
    ) {
      throw new BadRequestException(
        `Cannot toggle auto-renew for subscription with status: ${subscription.status}`,
      );
    }

    // Handle AutoPay Cancellation
    if (
      !enabled &&
      subscription.billingType === BillingType.AUTOPAY &&
      subscription.providerSubscriptionId
    ) {
      // Correct behavior: Cancel at Razorpay end
      await this.REMOVED_PAYMENT_INFRAService.cancelSubscription(
        subscription.providerSubscriptionId,
      );
    }

    // Logic: If enabling, and it was AutoPay but now cancelled?
    // Re-enabling a cancelled Razorpay subscription isn't usually possible via simple toggle.
    // User would need to buy/upgrade again.
    // So if billingType is AUTOPAY and we try to enable, check if it's possible?
    // For now, let's allow DB toggle, but Razorpay might remain cancelled.
    // Ideally, we should block re-enabling if Razorpay sub is already cancelled.

    // Simplification for Phase 1: Only handle Cancellation trigger.

    const updated = await this.prisma.tenantSubscription.update({
      where: { id: subscriptionId },
      data: {
        autoRenew: enabled,
        // If we cancelled at Razorpay, should we update autopayStatus?
        // Razorpay cancellation usually sets it to 'cancelled' or 'pending_cancel'.
        // We can let webhook handle the status update to 'CANCELLED' or 'HALTED'.
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
    const subscription = await this.prisma.tenantSubscription.findFirst({
      where: { tenantId, module, status: { in: ['ACTIVE', 'TRIAL'] } },
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

  /**
   * Check if tenant has access to a specific module
   * Checks:
   * 1. Primary subscription for this module
   * 2. Active add-on for this module in ANY active subscription
   */
  async hasModuleAccess(
    tenantId: string,
    module: ModuleType,
  ): Promise<boolean> {
    // 1. Check primary subscription
    const primary = await this.getActiveSubscription(tenantId, module);
    if (primary) return true;

    // 2. Check for add-ons in OTHER active subscriptions
    // Find any ACTIVE subscription that has an ACTIVE add-on for this module
    const subscriptionWithAddon =
      await this.prisma.tenantSubscription.findFirst({
        where: {
          tenantId,
          status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL] },
          endDate: { gt: new Date() },
          addons: {
            some: {
              addonPlan: { module }, // Check if addon plan matches the requested module
              status: SubscriptionStatus.ACTIVE,
              endDate: { gt: new Date() },
            },
          },
        },
      });

    return !!subscriptionWithAddon;
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

      this.eventEmitter.emit('subscription.active', {
        tenantId,
        module,
        planId: scheduled.planId,
        expiryDate: scheduled.endDate,
      });
    }

    // 2️⃣ Priority 1: ACTIVE (including grace period) or PAST_DUE
    const activeOrPastDue = await this.prisma.tenantSubscription.findFirst({
      where: {
        tenantId,
        module,
        OR: [
          {
            status: SubscriptionStatus.ACTIVE,
            startDate: { lte: now },
            // endDate check removed here to allow guards to handle grace period logic
            // but we'll filter for reasonable historical range to avoid ancient expired subs
            endDate: {
              gt: new Date(
                now.getTime() - SOFT_GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000,
              ),
            },
          },
          {
            status: SubscriptionStatus.PAST_DUE,
            startDate: { lte: now },
          },
        ],
      },
      include: {
        plan: { include: { planFeatures: true } },
        addons: {
          where: {
            status: {
              in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE],
            },
          },
          include: { addonPlan: { include: { planFeatures: true } } },
        },
      },
      orderBy: [
        { status: 'asc' }, // ACTIVE before PAST_DUE
        { startDate: 'desc' },
      ],
    });

    if (activeOrPastDue) return activeOrPastDue;

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

  /**
   * DOWNGRADE PRE-CHECK (alias for eligibility check)
   */
  async downgradePreCheck(
    tenantId: string,
    targetPlanId: string,
    module: ModuleType,
  ) {
    return this.checkDowngradeEligibility(tenantId, targetPlanId, module);
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
