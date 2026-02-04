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
      // Find all subscriptions ready for renewal
      const dueSubs = await this.prisma.tenantSubscription.findMany({
        where: {
          status: 'ACTIVE' as SubscriptionStatus,
          autoRenew: true,
          endDate: {
            lte: new Date(), // endDate is in the past or now
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

      // Process each subscription
      for (const sub of dueSubs) {
        try {
          // Renew subscription
          const renewed = await this.subscriptionsService.renewSubscription(
            sub.id,
          );

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
   * Manual trigger for testing
   * Can be called by admin endpoint
   */
  async manualAutoRenew() {
    this.logger.log('🔄 Manual auto-renew triggered');
    await this.autoRenewSubscriptions();
  }
}
