/**
 * Auto-Renew Cron Job (Phase 1)
 *
 * Runs daily to automatically renew subscriptions where:
 * - autoRenew = true
 * - status = ACTIVE
 * - endDate <= now (subscription expired)
 *
 * For each matching subscription:
 * 1. Call renewSubscription() to create new cycle
 * 2. Mark old subscription as COMPLETED
 * 3. Log renewal action for audit
 * 4. Send email notification
 *
 * Error Handling:
 * - Skip individual subscriptions that fail
 * - Log errors for manual review
 * - Continue processing remaining subscriptions
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionStatus, ModuleType, BillingCycle } from '@prisma/client';
import { SubscriptionsService } from './subscriptions/subscriptions.service';

@Injectable()
export class AutoRenewCronService {
  private readonly logger = new Logger(AutoRenewCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  /**
   * Run daily at 2 AM
   * Processes all subscriptions due for renewal
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async autoRenewSubscriptions() {
    this.logger.log('🔄 Starting auto-renew cycle...');

    try {
      // 🔄 CATCH-UP MECHANISM: Process renewals missed in last 3 days
      const lookbackDays = 3;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - lookbackDays);

      // Find all subscriptions ready for renewal (including missed ones)
      const dueSubs = await this.prisma.tenantSubscription.findMany({
        where: {
          status: 'ACTIVE' as SubscriptionStatus,
          autoRenew: true,
          endDate: {
            gte: cutoffDate, // Catch-up window
            lte: new Date(), // Up to now
          },
        },
        include: {
          tenant: true,
          plan: true,
        },
      });

      this.logger.log(`Found ${dueSubs.length} subscriptions due for renewal`);

      if (dueSubs.length === 0) {
        this.logger.log('✅ No subscriptions to renew');
        return;
      }

      let successCount = 0;
      let failCount = 0;

      // Process each subscription with retry logic
      for (const sub of dueSubs) {
        try {
          // 🔄 Renew subscription with retry
          const renewed = await this.renewWithRetry(sub.id);

          // Send email notification (disabled - no EmailService yet)
          /*
          try {
            const owner = await this.prisma.userTenant.findFirst({
              where: {
                tenantId: sub.tenantId,
                role: 'OWNER',
              },
              include: { user: true },
            });

            if (owner?.user?.email) {
              await emailService.send({
                to: owner.user.email,
                subject: `Subscription Renewed - ${sub.tenant.name}`,
                template: 'subscription-renewed',
                context: {
                  tenantName: sub.tenant.name,
                  planName: sub.plan.name,
                  billingCycle: renewed.billingCycle,
                  price: `₹${renewed.priceSnapshot ? renewed.priceSnapshot / 100 : 'N/A'}`,
                  nextExpiry: renewed.endDate.toLocaleDateString(),
                },
              });
            }
          } catch (emailErr) {
            this.logger.warn(
              `Failed to send renewal email for ${sub.tenant.name}: ${emailErr}`,
            );
            // Don't fail the renewal if email fails
          }
          */

          successCount++;
          this.logger.log(
            `✅ Renewed ${sub.tenant.name}@${sub.module} (${sub.plan.name})`,
          );
        } catch (err) {
          failCount++;
          this.logger.error(
            `❌ Failed to renew ${sub.tenant.name}@${sub.module}: ${err instanceof Error ? err.message : err}`,
          );
          // Continue with next subscription
        }
      }

      this.logger.log(
        `🏁 Auto-renew cycle complete: ${successCount} succeeded, ${failCount} failed`,
      );
    } catch (err) {
      this.logger.error(
        `❌ Auto-renew cron failed: ${err instanceof Error ? err.message : err}`,
        err instanceof Error ? err.stack : undefined,
      );
    }
  }

  /**
   * 🔄 Retry logic with exponential backoff
   * Attempts renewal up to 3 times with increasing delays
   */
  private async renewWithRetry(
    subscriptionId: string,
    maxRetries = 3,
  ): Promise<any> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.subscriptionsService.renewSubscription(
          subscriptionId,
        );
      } catch (err) {
        if (attempt === maxRetries) {
          // Final attempt failed
          throw err;
        }

        // Exponential backoff: 2s, 4s, 8s
        const delayMs = 1000 * Math.pow(2, attempt);
        this.logger.warn(
          `Retry attempt ${attempt}/${maxRetries} failed, waiting ${delayMs}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  /**
   * Manual trigger for testing
   * Can be called by admin endpoint
   */
  async manualAutoRenew() {
    this.logger.log('🔄 Manual auto-renew triggered');
    await this.autoRenewSubscriptions();
  }
}
