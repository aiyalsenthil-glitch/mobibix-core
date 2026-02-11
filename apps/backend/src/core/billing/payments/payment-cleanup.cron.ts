import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentStatus } from '@prisma/client';

/**
 * Payment Cleanup Cron Job
 *
 * This cron job runs hourly to mark expired pending payments as EXPIRED.
 * It prevents clutter in the Payment table and ensures accurate reporting.
 *
 * Razorpay orders expire after 15 minutes by default, but we track expiry
 * in our database to prevent late payments from being processed.
 */
@Injectable()
export class PaymentCleanupCron {
  private readonly logger = new Logger(PaymentCleanupCron.name);
  private isRunning = false; // Re-entrancy guard

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Mark expired payments as EXPIRED
   * Runs every hour at minute 0
   *
   * Example: 1:00 AM, 2:00 AM, 3:00 AM, etc.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredPayments() {
    // Prevent concurrent execution
    if (this.isRunning) {
      this.logger.warn(
        'Payment cleanup already running, skipping this execution',
      );
      return;
    }

    try {
      this.isRunning = true;
      this.logger.log('Starting payment cleanup cron job');

      const now = new Date();

      // Find all pending payments with expiry in the past
      const expiredPayments = await this.prisma.payment.findMany({
        where: {
          status: PaymentStatus.PENDING,
          expiresAt: {
            lt: now, // Expiry time is less than now (in the past)
          },
        },
        select: {
          id: true,
          providerOrderId: true,
          expiresAt: true,
          tenantId: true,
        },
      });

      if (expiredPayments.length === 0) {
        this.logger.log('No expired payments found');
        return;
      }

      this.logger.log(
        `Found ${expiredPayments.length} expired payments to mark as EXPIRED`,
      );

      // Mark all as EXPIRED in bulk
      const result = await this.prisma.payment.updateMany({
        where: {
          status: PaymentStatus.PENDING,
          expiresAt: {
            lt: now,
          },
        },
        data: {
          status: PaymentStatus.EXPIRED,
        },
      });

      this.logger.log(
        `Successfully marked ${result.count} expired payments as EXPIRED`,
      );

      // Log details for debugging (limit to 10 for readability)
      const loggedPayments = expiredPayments.slice(0, 10);
      loggedPayments.forEach((payment) => {
        const minutesAgo = Math.floor(
          (now.getTime() - payment.expiresAt!.getTime()) / 1000 / 60,
        );
        this.logger.debug(
          `Expired: ${payment.providerOrderId} (expired ${minutesAgo} minutes ago)`,
        );
      });

      if (expiredPayments.length > 10) {
        this.logger.debug(`... and ${expiredPayments.length - 10} more`);
      }
    } catch (error) {
      this.logger.error('Failed to cleanup expired payments:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Get statistics about payment expiry (for monitoring/debugging)
   * Can be called via admin API endpoint
   */
  async getPaymentStats(): Promise<{
    totalPending: number;
    expiredButNotMarked: number;
    expiredAndMarked: number;
    activeOrders: number;
  }> {
    const now = new Date();

    const [totalPending, expiredButNotMarked, expiredAndMarked, activeOrders] =
      await Promise.all([
        // Total PENDING payments
        this.prisma.payment.count({
          where: { status: PaymentStatus.PENDING },
        }),

        // Expired but still marked as PENDING (should be 0 after cleanup)
        this.prisma.payment.count({
          where: {
            status: PaymentStatus.PENDING,
            expiresAt: { lt: now },
          },
        }),

        // Properly marked as EXPIRED
        this.prisma.payment.count({
          where: { status: PaymentStatus.EXPIRED },
        }),

        // Active orders (PENDING and not expired yet)
        this.prisma.payment.count({
          where: {
            status: PaymentStatus.PENDING,
            expiresAt: { gte: now },
          },
        }),
      ]);

    return {
      totalPending,
      expiredButNotMarked,
      expiredAndMarked,
      activeOrders,
    };
  }
}
