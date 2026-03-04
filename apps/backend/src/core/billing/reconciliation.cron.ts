import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { RazorpayService } from '../billing/REMOVED_PAYMENT_INFRA.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class ReconciliationCron {
  private readonly logger = new Logger(ReconciliationCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly REMOVED_PAYMENT_INFRAService: RazorpayService,
    @InjectQueue('REMOVED_PAYMENT_INFRA-webhooks') private readonly webhookQueue: Queue,
  ) {}

  /**
   * Daily reconciliation at 3 AM to avoid overlapping with high-traffic periods
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async reconcilePayments() {
    this.logger.log('Starting daily Razorpay reconciliation job...');
    const startTime = Date.now();

    try {
      await this.reconcileLocalToRazorpay();
      await this.reconcileRazorpayToLocal();
      await this.reconcileSubscriptionStates(); // FIX 3: detect stuck PENDING mandates
    } catch (err: any) {
      this.logger.error('CRITICAL: Reconciliation job FAILED', err.stack);
    } finally {
      const duration = Math.round((Date.now() - startTime) / 1000);
      this.logger.log(`Reconciliation job finished in ${duration}s.`);
    }
  }

  /**
   * A) Local -> Razorpay
   * Catch stuck PENDING payments by checking status on provider
   */
  private async reconcileLocalToRazorpay() {
    // Check payments older than 1 hour but newer than 24 hours (avoid checking ancient history)
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const pendingPayments = await this.prisma.payment.findMany({
      where: {
        status: 'PENDING',
        createdAt: {
          gt: twentyFourHoursAgo,
          lt: oneHourAgo,
        },
        providerPaymentId: { not: null },
      },
    });

    if (pendingPayments.length === 0) return;

    this.logger.log(`[RECON][A] Checking ${pendingPayments.length} pending local payment records...`);

    for (const payment of pendingPayments) {
      if (!payment.providerPaymentId) continue;

      try {
        const rpPayment = await this.REMOVED_PAYMENT_INFRAService.fetchPayment(payment.providerPaymentId);
        
        if (rpPayment?.status === 'captured') {
          this.logger.log(`[RECON][A] Discovered captured payment ${payment.providerPaymentId} stuck as PENDING locally. Syncing...`);
          await this.queueSyntheticWebhook('payment.captured', rpPayment);
        } else if (rpPayment?.status === 'failed') {
          this.logger.log(`[RECON][A] Discovered failed payment ${payment.providerPaymentId}. Syncing...`);
          await this.queueSyntheticWebhook('payment.failed', rpPayment);
        }
      } catch (err: any) {
        this.logger.error(`[RECON][A] Error checking payment ${payment.providerPaymentId}`, err.message);
      }
    }
  }

  /**
   * B) Razorpay -> Local (Critical for true orphans)
   * Fetch captured payments from Razorpay directly to ensure our DB isn't missing anything
   */
  private async reconcileRazorpayToLocal() {
    // Fetch from yesterday (24h window)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const startTimestamp = Math.floor(yesterday.getTime() / 1000);
    const endTimestamp = startTimestamp + 24 * 60 * 60;

    try {
      const rpPayments = await this.REMOVED_PAYMENT_INFRAService.fetchRecentPayments(startTimestamp, endTimestamp);
      const payments = rpPayments.items || [];

      if (payments.length === 0) return;

      this.logger.log(`[RECON][B] Fetched ${payments.length} recent payments from Razorpay for synchronization.`);

      for (const rpPayment of payments) {
        if (rpPayment.status !== 'captured') continue;

        // Idempotency Check: skip if exists
        const exists = await this.prisma.payment.findFirst({
          where: { providerPaymentId: rpPayment.id },
        });

        if (!exists) {
          this.logger.warn(`[RECON][B] Found ORPHANED Razorpay payment ${rpPayment.id} not found locally! Queueing activation.`);
          // The processor's handlePaymentCaptured logic handles existing vs new record creation
          // as long as notes or other linkage exists. 
          await this.queueSyntheticWebhook('payment.captured', rpPayment);
        }
      }
    } catch (err: any) {
      this.logger.error('[RECON][B] Fetching recent Razorpay payments FAILED', err.message);
    }
  }

  /**
   * Queues a synthetic webhook job to consistent processing via the RazorpayWebhookProcessor
   */
  private async queueSyntheticWebhook(event: string, entity: any) {
    const syntheticId = `reconciliation_${entity.id}_${Date.now()}`;

    await this.webhookQueue.add(
      'process-webhook',
      {
        event,
        eventId: syntheticId,
        payload: {
          payment: { entity },
        },
        metadata: {
          reconciled: true,
          scheduled_at: new Date().toISOString(),
        },
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
      },
    );
  }

  /**
   * C) Subscription State Reconciliation (FIX 3)
   *
   * Detects autopay subscriptions stuck in PENDING because the eMandate
   * activation webhook was never delivered (network failure, Razorpay retry
   * exhausted, etc.). For each stuck sub, fetches the live state from
   * Razorpay and fires a synthetic webhook so the processor can handle it
   * through the normal idempotent path.
   *
   * Guardrails:
   *  - autoRenew: true  — excludes manual (MANUAL BillingType) PENDING subs
   *  - providerSubscriptionId: { not: null }  — confirms it's an autopay sub
   *  - createdAt: { lt: oneHourAgo }  — avoids racing with brand-new subs
   */
  private async reconcileSubscriptionStates() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const stuckPendingSubs = await this.prisma.tenantSubscription.findMany({
      where: {
        status: 'PENDING',
        autoRenew: true,                          // GUARDRAIL: only autopay subs
        providerSubscriptionId: { not: null },    // must have a Razorpay sub ID
        autopayStatus: null,                      // mandate never confirmed active
        createdAt: { lt: oneHourAgo },            // avoid racing brand-new subs
      },
    });

    if (stuckPendingSubs.length === 0) {
      this.logger.log('[RECON][C] No stuck PENDING autopay subscriptions found.');
      return;
    }

    this.logger.log(
      `[RECON][C] Checking ${stuckPendingSubs.length} stuck PENDING autopay subscription(s)...`,
    );

    for (const sub of stuckPendingSubs) {
      if (!sub.providerSubscriptionId) continue;

      try {
        const rpSub = await this.REMOVED_PAYMENT_INFRAService.fetchSubscription(
          sub.providerSubscriptionId,
        );

        if (!rpSub) {
          this.logger.warn(
            `[RECON][C] Could not fetch Razorpay sub ${sub.providerSubscriptionId} for local sub ${sub.id}. Skipping.`,
          );
          continue;
        }

        this.logger.log(
          `[RECON][C] Sub ${sub.id}: local=PENDING, REMOVED_PAYMENT_INFRA=${rpSub.status}`,
        );

        if (rpSub.status === 'halted') {
          // eMandate failed after retries — fire synthetic halted webhook
          this.logger.warn(
            `[RECON][C] Sub ${sub.id} is HALTED on Razorpay. Firing synthetic subscription.halted.`,
          );
          await this.queueSyntheticSubscriptionWebhook('subscription.halted', rpSub);
        } else if (rpSub.status === 'cancelled') {
          // Cancelled from Razorpay dashboard before even activating
          this.logger.warn(
            `[RECON][C] Sub ${sub.id} is CANCELLED on Razorpay. Firing synthetic subscription.cancelled.`,
          );
          await this.queueSyntheticSubscriptionWebhook('subscription.cancelled', rpSub);
        } else if (rpSub.status === 'active') {
          // Activated on Razorpay but we missed the webhook — fire synthetic activated
          this.logger.log(
            `[RECON][C] Sub ${sub.id} is ACTIVE on Razorpay but PENDING locally. Firing synthetic subscription.activated.`,
          );
          await this.queueSyntheticSubscriptionWebhook('subscription.activated', rpSub);
        }
        // 'created' state means mandate is still pending user auth — do nothing
      } catch (err: any) {
        this.logger.error(
          `[RECON][C] Error checking subscription ${sub.providerSubscriptionId}`,
          err.message,
        );
      }
    }
  }

  /**
   * Queues a synthetic SUBSCRIPTION webhook (distinct from payment webhook)
   * using the subscription entity as the payload root — matching Razorpay’s
   * real webhook shape for subscription events.
   */
  private async queueSyntheticSubscriptionWebhook(event: string, subEntity: any) {
    const syntheticId = `reconciliation_sub_${subEntity.id}_${Date.now()}`;

    await this.webhookQueue.add(
      'process-webhook',
      {
        event,
        eventId: syntheticId,
        payload: {
          subscription: { entity: subEntity },
        },
        metadata: {
          reconciled: true,
          scheduled_at: new Date().toISOString(),
        },
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
      },
    );
  }
}
