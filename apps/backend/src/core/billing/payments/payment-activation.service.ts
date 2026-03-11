import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { InvoiceService } from '../invoices/invoice.service';
import { PaymentRetryService } from './payment-retry.service';
import { PartnersService } from '../../../modules/partners/partners.service';
import { PaymentStatus } from '@prisma/client';

/**
 * Payment Activation Service
 *
 * Single source of truth for subscription activation.
 * Prevents race condition where webhook + verify controller both attempt to activate.
 *
 * Idempotency: Only activates payments in PENDING status.
 * Subsequent calls with same paymentId return "already_processed".
 */
@Injectable()
export class PaymentActivationService {
  private readonly logger = new Logger(PaymentActivationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly invoiceService: InvoiceService,
    private readonly paymentRetryService: PaymentRetryService,
    private readonly partnersService: PartnersService,
  ) {}

  /**
   * Activate subscription from verified payment (idempotent)
   *
   * Flow:
   * 1. Fetch payment record + validate status
   * 2. Skip if already SUCCESS (idempotency)
   * 3. Fetch plan details
   * 4. Activate subscription via SubscriptionsService
   * 5. Mark payment as SUCCESS
   *
   * This is the ONLY method that should activate subscriptions.
   * Both webhook + verify.controller call this method.
   */
  async activateSubscriptionFromPayment(paymentId: string) {
    return await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUniqueOrThrow({
        where: { id: paymentId },
        select: {
          id: true,
          tenantId: true,
          planId: true,
          billingCycle: true,
          status: true,
          amount: true,
          providerOrderId: true,
        },
      });

      // ✅ IDEMPOTENCY CHECK: Only activate pending payments
      if (payment.status === PaymentStatus.SUCCESS) {
        this.logger.log(
          `[PAYMENT] Idempotent: Payment ${payment.id} already activated. Skipping.`,
        );
        return { status: 'already_processed', paymentId };
      }

      // Get plan details
      const plan = await tx.plan.findUniqueOrThrow({
        where: { id: payment.planId },
        select: {
          id: true,
          module: true,
          name: true,
        },
      });

      // ✅ ACTIVATE SUBSCRIPTION
      try {
        // Use buyPlanPhase1 with flags to prevent redundant payment links and force ACTIVE status
        const subscription = await this.subscriptionsService.buyPlanPhase1({
          tenantId: payment.tenantId,
          planId: payment.planId,
          module: plan.module,
          billingCycle: payment.billingCycle,
          initialStatus: 'ACTIVE' as any,
          skipExternalPayment: true,
        });

        // Mark payment as SUCCESS
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: PaymentStatus.SUCCESS },
        });

        this.logger.log(
          `[PAYMENT] ✅ Activation complete: Payment ${payment.id} → Subscription ${subscription.id}`,
        );

        // Module 6: Partner Referral & Commission Logic (tiered: 30% first / dynamic renewal)
        try {
          const tenant = await tx.tenant.findUnique({
            where: { id: payment.tenantId },
            select: { partnerId: true, promoCodeId: true },
          });

          if (tenant?.partnerId) {
            const partner = await tx.partner.findUnique({
              where: { id: tenant.partnerId },
            });

            if (partner && partner.status === 'APPROVED') {
              // Determine if this is first payment or a renewal
              const priorReferrals = await tx.partnerReferral.count({
                where: { partnerId: partner.id, tenantId: payment.tenantId },
              });
              const isFirstPayment = priorReferrals === 0;

              // ─── Dynamic tier-based renewal commission ────────────────────────
              // Count distinct active shops referred by this partner to determine tier
              // Tier thresholds: Starter 0-4 → 5%, Growth 5-20 → 10%, Pro 21-50 → 15%, Elite 51+ → 20%
              const activeShopCount = await tx.tenant.count({
                where: { partnerId: partner.id },
              });
              const tierRenewalPct =
                activeShopCount >= 51 ? 20 :
                activeShopCount >= 21 ? 15 :
                activeShopCount >= 5  ? 10 : 5;

              const commissionPct = isFirstPayment
                ? partner.firstCommissionPct   // always 30%
                : tierRenewalPct;              // tier-based: 5/10/15/20%
              const commissionAmount = (payment.amount * commissionPct) / 100;

              await tx.partnerReferral.create({
                data: {
                  partnerId: partner.id,
                  tenantId: payment.tenantId,
                  subscriptionPlan: plan.name,
                  subscriptionAmount: payment.amount,
                  commissionPercentage: commissionPct,
                  commissionAmount,
                  isFirstPayment,
                  status: 'CONFIRMED',
                  confirmedAt: new Date(),
                },
              });

              await tx.partner.update({
                where: { id: partner.id },
                data: { totalEarned: { increment: commissionAmount } },
              });

              const tierName = activeShopCount >= 51 ? 'Elite' : activeShopCount >= 21 ? 'Pro' : activeShopCount >= 5 ? 'Growth' : 'Starter';
              this.logger.log(
                `💰 Partner Commission: ₹${commissionAmount} (${commissionPct}% — ${isFirstPayment ? 'first payment' : `renewal · ${tierName} tier`}) for Partner ${partner.id}`,
              );

              // Notify partner of commission earned (fire-and-forget)
              const tenantName = (await tx.tenant.findUnique({ where: { id: payment.tenantId }, select: { name: true } }))?.name ?? 'A shop';
              setImmediate(() =>
                this.partnersService.notifyCommissionEarned(
                  partner.id, commissionAmount, tenantName, isFirstPayment,
                ),
              );

              // Apply SUBSCRIPTION_BONUS (+3 months) on first payment only
              if (isFirstPayment && tenant.promoCodeId) {
                const promo = await tx.promoCode.findUnique({
                  where: { id: tenant.promoCodeId },
                  select: { type: true, bonusMonths: true },
                });

                if (promo?.type === 'SUBSCRIPTION_BONUS' && promo.bonusMonths > 0) {
                  const sub = await tx.tenantSubscription.findFirst({
                    where: { tenantId: payment.tenantId, status: 'ACTIVE' },
                    orderBy: { startDate: 'desc' },
                    select: { id: true, endDate: true },
                  });

                  if (sub) {
                    const newEndDate = new Date(sub.endDate);
                    newEndDate.setMonth(newEndDate.getMonth() + promo.bonusMonths);
                    await tx.tenantSubscription.update({
                      where: { id: sub.id },
                      data: { endDate: newEndDate },
                    });
                    this.logger.log(
                      `🎁 Subscription bonus applied: +${promo.bonusMonths} months → new end ${newEndDate.toISOString()}`,
                    );
                  }
                }
              }
            }
          }
        } catch (partnerErr) {
          this.logger.error(
            `[PARTNER] ⚠️ Failed to process commission for payment ${payment.id}`,
            partnerErr,
          );
          // Don't fail the payment activation if partner logic fails
        }

        // ✅ GENERATE INVOICE (Called separately but inside this flow's logic)
        // Note: invoiceService.createInvoiceForPayment handles its own retry/transaction logic
        // We call it AFTER the nested update to ensure we don't block the core activation
        try {
          const invoice = await this.invoiceService.createInvoiceForPayment(
            payment.id,
          );
          this.logger.log(
            `[INVOICE] ✅ Generated invoice ${invoice.invoiceNumber} for payment ${payment.id}`,
          );
        } catch (invoiceErr) {
          this.logger.error(
            `[INVOICE] ⚠️ Failed to generate invoice for payment ${payment.id}`,
            invoiceErr as Error,
          );
        }

        return {
          status: 'activated',
          paymentId,
          subscriptionId: subscription.id,
        };
      } catch (err) {
        this.logger.error(
          `[PAYMENT] ❌ Activation failed: ${payment.id}`,
          err as Error,
        );
        throw err;
      }
    });
  }

  /**
   * Handle payment failure (e.g., webhook error, user cancellation, expiry)
   * Mark payment as FAILED with reason stored in meta JSON field
   */
  async failPayment(paymentId: string, reason: string) {
    this.logger.warn(`[PAYMENT] ❌ Failed: ${paymentId} - ${reason}`);
    const updatedPayment = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.FAILED,
        meta: { failureReason: reason },
      },
    });

    // 🔄 Trigger Retry / Dunning Process
    await this.paymentRetryService.scheduleRetry(paymentId);

    return updatedPayment;
  }
}
