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
import {
  SubscriptionStatus,
  ModuleType,
  BillingCycle,
  BillingType,
} from '@prisma/client';
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
   * NOTE: Extracted from internal @Cron to a designated K8s CronJob
   */
  async autoRenewSubscriptions() {
    this.logger.log('🔄 Starting auto-renew cycle...');

    const [{ pg_try_advisory_lock: gotLock }] = await this.prisma.$queryRaw<
      { pg_try_advisory_lock: boolean }[]
    >`
      SELECT pg_try_advisory_lock(12345)
    `;

    if (!gotLock) {
      this.logger.warn(
        'Another cron instance is already running auto-renew. Skipping.',
      );
      return;
    }

    try {
      // 🔄 CATCH-UP MECHANISM: Process renewals missed in last 3 days
      const lookbackDays = 3;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - lookbackDays);

      const P_LIMIT_CONCURRENCY = 5;
      const CHUNK_SIZE = 50;

      // Dynamic import because p-limit is an ESM module and NestJS uses CommonJS
      const pLimit = (await import('p-limit')).default;
      const limit = pLimit(P_LIMIT_CONCURRENCY);

      let successCount = 0;
      let failCount = 0;
      let hasMore = true;
      let lastId: string | undefined = undefined;

      while (hasMore) {
        // Find all subscriptions ready for renewal using cursor pagination
        const dueSubs = await this.prisma.tenantSubscription.findMany({
          where: {
            status: 'ACTIVE' as SubscriptionStatus,
            autoRenew: true,
            billingType: { not: BillingType.AUTOPAY },
            endDate: {
              gte: cutoffDate, // Catch-up window
              lte: new Date(), // Up to now
            },
          },
          include: {
            tenant: true,
            plan: true,
          },
          take: CHUNK_SIZE,
          ...(lastId ? { skip: 1, cursor: { id: lastId } } : {}),
          orderBy: { id: 'asc' }, // Ensure stable ordering for cursor
        });

        if (dueSubs.length === 0) {
          hasMore = false;
          break;
        }

        this.logger.log(
          `Processing chunk of ${dueSubs.length} subscriptions...`,
        );

        // Process chunk concurrently but limited
        const promises = dueSubs.map((sub) =>
          limit(async () => {
            try {
              // 🔄 Renew subscription with retry
              const renewed = await this.renewWithRetry(sub.id);

              successCount++;
              this.logger.log(
                `✅ Renewed ${sub.tenant.name}@${sub.module} (${sub.plan.name})`,
              );
            } catch (err) {
              failCount++;
              this.logger.error(
                `❌ Failed to renew ${sub.tenant.name}@${sub.module}: ${err instanceof Error ? err.message : err}`,
              );
            }
          }),
        );

        await Promise.all(promises);

        if (dueSubs.length < CHUNK_SIZE) {
          hasMore = false;
        } else {
          lastId = dueSubs[dueSubs.length - 1].id;
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
    } finally {
      // Release distributed instance lock
      await this.prisma.$queryRaw`SELECT pg_advisory_unlock(12345)`;
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
          `Retry attempt ${attempt}/${maxRetries} failed: ${err instanceof Error ? err.message : err}. Waiting ${delayMs}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  /**
   * Daily at 3 AM — downgrade expired TRIAL subscriptions to the FREE lifetime plan
   * (GYM_FREE for GYM module, MOBIBIX_FREE for MOBILE_SHOP module)
   * Runs after subscription.cron.ts (1 AM) which marks TRIALs as EXPIRED.
   */
  @Cron('0 3 * * *')
  async downgradeExpiredTrials() {
    this.logger.log('⬇️ Checking for expired trials to downgrade to FREE...');

    const now = new Date();

    // Find EXPIRED TRIAL subscriptions (level 0, not lifetime) for GYM/MOBILE_SHOP
    // Only trial plans auto-downgrade — expired STANDARD/PRO should stay expired (user renews manually)
    const expiredTrials = await this.prisma.tenantSubscription.findMany({
      where: {
        status: SubscriptionStatus.EXPIRED,
        module: { in: [ModuleType.GYM, ModuleType.MOBILE_SHOP] },
        plan: {
          isLifetime: false,
          level: 0,                       // Trial plans are level 0
          code: { contains: 'TRIAL' },    // Extra safety: only plans with TRIAL in the code
        },
      },
      include: { tenant: true },
    });

    if (expiredTrials.length === 0) {
      this.logger.log('No expired trials found.');
      return;
    }

    // Fetch FREE plans for each module
    const [gymFree, mobiFree] = await Promise.all([
      this.prisma.plan.findFirst({ where: { code: 'GYM_FREE', isActive: true } }),
      this.prisma.plan.findFirst({ where: { code: 'MOBIBIX_FREE', isActive: true } }),
    ]);

    let downgraded = 0;

    for (const sub of expiredTrials) {
      const freePlan =
        sub.module === ModuleType.GYM ? gymFree :
        sub.module === ModuleType.MOBILE_SHOP ? mobiFree : null;

      if (!freePlan) {
        this.logger.warn(`No FREE plan found for module ${sub.module}, skipping tenant ${sub.tenantId}`);
        continue;
      }

      // Check if FREE subscription already exists for this tenant+module
      const existing = await this.prisma.tenantSubscription.findFirst({
        where: { tenantId: sub.tenantId, module: sub.module, planId: freePlan.id },
      });

      if (existing) {
        // Already downgraded — just mark trial as EXPIRED
        await this.prisma.tenantSubscription.update({
          where: { id: sub.id },
          data: { status: SubscriptionStatus.EXPIRED },
        });
        continue;
      }

      // Create FREE lifetime subscription + expire the trial atomically
      await this.prisma.$transaction([
        this.prisma.tenantSubscription.update({
          where: { id: sub.id },
          data: { status: SubscriptionStatus.EXPIRED },
        }),
        this.prisma.tenantSubscription.create({
          data: {
            tenantId: sub.tenantId,
            planId: freePlan.id,
            module: sub.module,
            status: SubscriptionStatus.ACTIVE,
            billingCycle: BillingCycle.MONTHLY,
            billingType: BillingType.MANUAL,
            startDate: now,
            autoRenew: false,
          },
        }),
      ]);

      downgraded++;
      this.logger.log(
        `⬇️ Downgraded ${sub.tenant.name}@${sub.module} trial → FREE (${freePlan.name})`,
      );
    }

    this.logger.log(`⬇️ Trial downgrade complete: ${downgraded} tenants downgraded.`);
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
