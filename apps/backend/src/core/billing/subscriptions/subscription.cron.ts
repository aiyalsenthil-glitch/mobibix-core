import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SubscriptionCron {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // Runs every night at 1 AM
  @Cron('0 1 * * *')
  async expireSubscriptions() {
    const now = new Date();

    // 1. Expire Trials
    const trials = await this.prisma.tenantSubscription.findMany({
      where: {
        status: { in: ['TRIAL', 'PENDING'] },
        endDate: { lt: now },
      },
    });

    for (const sub of trials) {
      await this.prisma.tenantSubscription.update({
        where: { id: sub.id },
        data: { status: 'EXPIRED' },
      });
      this.eventEmitter.emit('subscription.expired', {
        tenantId: sub.tenantId,
        module: sub.module,
        reason: 'TRIAL_ENDED',
      });
    }

    // 2. Expire Non-renewing Active/PastDue Subs
    const nonRenewing = await this.prisma.tenantSubscription.findMany({
      where: {
        status: { in: ['ACTIVE', 'PAST_DUE'] },
        autoRenew: false,
        endDate: { lt: now },
      },
    });

    for (const sub of nonRenewing) {
      await this.prisma.tenantSubscription.update({
        where: { id: sub.id },
        data: { status: 'EXPIRED' },
      });
      this.eventEmitter.emit('subscription.expired', {
        tenantId: sub.tenantId,
        module: sub.module,
        reason: 'EXPIRED_NON_RENEWING',
      });
    }

    // 3. Expire Abandoned Auto-renewing Subs
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const staleAutoRenew = await this.prisma.tenantSubscription.findMany({
      where: {
        status: 'PAST_DUE',
        autoRenew: true,
        endDate: { lt: thirtyDaysAgo },
      },
    });

    for (const sub of staleAutoRenew) {
      await this.prisma.tenantSubscription.update({
        where: { id: sub.id },
        data: { status: 'EXPIRED' },
      });
      this.eventEmitter.emit('subscription.expired', {
        tenantId: sub.tenantId,
        module: sub.module,
        reason: 'ABANDONED_AUTOPAY',
      });
    }

    console.log(
      `[CRON][Expiry][${now.toISOString()}] ` +
        `Trials: ${trials.length} | Non-Renewing: ${nonRenewing.length} | Stale Auto-Pay: ${staleAutoRenew.length}`,
    );
  }
}
