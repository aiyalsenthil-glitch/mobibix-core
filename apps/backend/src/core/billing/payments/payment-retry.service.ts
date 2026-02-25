import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentStatus, PaymentRetryStatus, ModuleType } from '@prisma/client';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PaymentFailedEvent } from '../../../common/email/email.events';

@Injectable()
export class PaymentRetryService {
  private readonly logger = new Logger(PaymentRetryService.name);

  // Dunning Schedule (in hours from initial failure)
  private readonly RETRY_SCHEDULE = [1, 24, 72]; // 1h, 1d, 3d

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Schedule the next retry for a failed payment.
   * Called when:
   * 1. A payment fails initially (webhook/verify).
   * 2. A retry attempt "fails" (e.g. user still hasn't paid).
   */
  async scheduleRetry(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { retries: true },
    });

    if (!payment) {
      this.logger.warn(`[RETRY] Payment ${paymentId} not found.`);
      return;
    }

    if (payment.status === PaymentStatus.SUCCESS) {
      this.logger.log(
        `[RETRY] Payment ${paymentId} is already SUCCESS. Skipping retry.`,
      );
      return;
    }

    const retryCount = payment.retries.length;

    if (retryCount >= this.RETRY_SCHEDULE.length) {
      this.logger.log(
        `[RETRY] Max retries reached for payment ${paymentId}. Dunning complete.`,
      );
      // Optional: Cancel subscription here if not already active?
      return;
    }

    const delayHours = this.RETRY_SCHEDULE[retryCount];
    const nextRetryTime = new Date();
    nextRetryTime.setHours(nextRetryTime.getHours() + delayHours);

    await this.prisma.paymentRetry.create({
      data: {
        paymentId,
        retryCount: retryCount + 1,
        status: PaymentRetryStatus.PENDING,
        scheduledAt: nextRetryTime,
      },
    });

    this.logger.log(
      `[RETRY] Scheduled retry #${retryCount + 1} for payment ${paymentId} at ${nextRetryTime.toISOString()}`,
    );
  }

  /**
   * Cron Job: Process pending retries
   * Runs every hour to check for due retries.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleCron() {
    this.logger.log('[RETRY] Checking for due payment retries...');

    const now = new Date();
    const pendingRetries = await this.prisma.paymentRetry.findMany({
      where: {
        status: PaymentRetryStatus.PENDING,
        scheduledAt: { lte: now },
      },
      include: { payment: true },
    });

    if (pendingRetries.length === 0) {
      this.logger.log('[RETRY] No pending retries found.');
      return;
    }

    this.logger.log(
      `[RETRY] Found ${pendingRetries.length} retries to process.`,
    );

    for (const retry of pendingRetries) {
      try {
        await this.executeRetry(retry);
      } catch (err) {
        this.logger.error(`[RETRY] Error processing retry ${retry.id}`, err);
      }
    }
  }

  /**
   * Execute a single retry attempt.
   * - Check if payment is resolved.
   * - If not, send dunning email.
   * - Schedule next retry.
   */
  async executeRetry(retry: any) {
    const { payment } = retry;

    // 1. Double-check payment status
    const freshPayment = await this.prisma.payment.findUnique({
      where: { id: payment.id },
    });

    if (freshPayment?.status === PaymentStatus.SUCCESS) {
      this.logger.log(
        `[RETRY] Payment ${payment.id} resolved by user. Marking retry CANCELLED.`,
      );
      await this.prisma.paymentRetry.update({
        where: { id: retry.id },
        data: {
          status: PaymentRetryStatus.CANCELLED,
          executedAt: new Date(),
          failureReason: 'Payment already successful',
        },
      });
      return;
    }

    // 2. Perform Dunning Action (Email)
    // Fetch tenant to know module type and email
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: payment.tenantId },
      include: { users: { where: { role: 'OWNER' } } },
    });

    if (tenant && tenant.users[0]?.email) {
      const module =
        tenant.tenantType === 'GYM' ? ModuleType.GYM : ModuleType.MOBILE_SHOP;

      // Calculate next retry time for display
      const nextRetryDelay = this.RETRY_SCHEDULE[retry.retryCount] || null;
      const nextRetryDate = nextRetryDelay
        ? new Date(Date.now() + nextRetryDelay * 3600000)
        : null;

      await this.eventEmitter.emitAsync(
        'payment.failed',
        new PaymentFailedEvent(
          tenant.id,
          module,
          new Date(),
          payment,
          retry.retryCount,
          nextRetryDate,
        ),
      );
      this.logger.log(
        `[DUNNING] Emitted payment.failed event for ${tenant.users[0].email}`,
      );
    } else {
      this.logger.warn(
        `[DUNNING] Could not send email: Tenant or Owner email missing for ${payment.tenantId}`,
      );
    }

    // 3. Mark this retry as PROCESSED
    await this.prisma.paymentRetry.update({
      where: { id: retry.id },
      data: {
        status: PaymentRetryStatus.PROCESSED,
        executedAt: new Date(),
      },
    });

    // 4. Schedule NEXT retry (if applicable)
    // This creates the *next* retry record for the future
    await this.scheduleRetry(payment.id);
  }
}
