import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SubscriptionCron {
  constructor(private readonly prisma: PrismaService) {}

  // Runs every night at 1 AM
  @Cron('0 1 * * *')
  async expireSubscriptions() {
    const now = new Date();

    // 1. Expire Trials
    const trials = await this.prisma.tenantSubscription.updateMany({
      where: {
        status: { in: ['TRIAL', 'PENDING'] }, // Expire unactivated pending too
        endDate: { lt: now },
      },
      data: {
        status: 'EXPIRED',
      },
    });

    // 2. Expire Non-renewing Active/PastDue Subs
    // If autoRenew is OFF and end date passed, they MUST be EXPIRED immediately.
    const nonRenewing = await this.prisma.tenantSubscription.updateMany({
      where: {
        status: { in: ['ACTIVE', 'PAST_DUE'] },
        autoRenew: false,
        endDate: { lt: now },
      },
      data: {
        status: 'EXPIRED',
      },
    });

    // 3. Expire Abandoned Auto-renewing Subs
    // If autoRenew is ON but they stayed PAST_DUE for too long (e.g., 30 days past endDate)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const staleAutoRenew = await this.prisma.tenantSubscription.updateMany({
      where: {
        status: 'PAST_DUE',
        autoRenew: true,
        endDate: { lt: thirtyDaysAgo },
      },
      data: {
        status: 'EXPIRED',
      },
    });

    console.log(
      `[CRON][Expiry][${now.toISOString()}] ` +
        `Trials: ${trials.count} | Non-Renewing: ${nonRenewing.count} | Stale Auto-Pay: ${staleAutoRenew.count}`,
    );
  }
}
