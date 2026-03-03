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
}
