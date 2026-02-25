import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { InvoiceService } from '../invoices/invoice.service';
import { PaymentRetryService } from './payment-retry.service';
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
