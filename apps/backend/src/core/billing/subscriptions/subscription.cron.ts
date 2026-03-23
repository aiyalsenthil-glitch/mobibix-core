import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { HARD_GRACE_PERIOD_HOURS } from '../grace-period.constants';

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
    const gracePeriodMs = HARD_GRACE_PERIOD_HOURS * 60 * 60 * 1000;
    const graceThreshold = new Date(now.getTime() - gracePeriodMs);

    // 1. Expire Trials (No Grace)
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

    // 2. Expire Non-Autopay (Manual) Active/PastDue Subs
    const manualExpired = await this.prisma.tenantSubscription.findMany({
      where: {
        status: { in: ['ACTIVE', 'PAST_DUE'] },
        OR: [
          { autopayStatus: { not: 'ACTIVE' } },
          { autopayStatus: null },
          { autoRenew: false },
        ],
        endDate: { lt: now },
      },
    });

    for (const sub of manualExpired) {
      await this.prisma.tenantSubscription.update({
        where: { id: sub.id },
        data: { status: 'EXPIRED' },
      });
      this.eventEmitter.emit('subscription.expired', {
        tenantId: sub.tenantId,
        module: sub.module,
        reason: 'EXPIRED_MANUAL',
      });
    }

    // 3. Expire Autopay Subs (With 24-Hour Grace)
    // Only expire if past grace threshold (e.g., endDate was > 24h ago)
    const autopayExpired = await this.prisma.tenantSubscription.findMany({
      where: {
        status: { in: ['ACTIVE', 'PAST_DUE'] },
        autopayStatus: 'ACTIVE',
        autoRenew: true,
        endDate: { lt: graceThreshold },
      },
    });

    for (const sub of autopayExpired) {
      await this.prisma.tenantSubscription.update({
        where: { id: sub.id },
        data: { status: 'EXPIRED' },
      });
      this.eventEmitter.emit('subscription.expired', {
        tenantId: sub.tenantId,
        module: sub.module,
        reason: 'EXPIRED_AUTOPAY_AFTER_GRACE',
      });
    }

    // 4. Cleanup Abandoned Auto-renewing Subs (Sanity check)
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
  }
}
