import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SubscriptionTrialExpiringEvent } from '../../../common/email/email.events';
// import { EmailService } from '../../../common/email'; <-- Removed direct usage

@Injectable()
export class SubscriptionExpiryCron {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // 🔒 Prevent parallel executions
  private isRunning = false;

  // ⏳ Simple throttle helper (Resend: 2 req/sec)
  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Runs once per day at 9 AM
   * (Server timezone — OK for now)
   */
  @Cron('0 9 * * *')
  async sendExpiryReminders() {
    // 🛑 Re-entrancy guard
    if (this.isRunning) {

      return;
    }

    this.isRunning = true;

    try {


      // 📅 RANGE window: today → next 7 days
      const start = new Date();
      start.setHours(0, 0, 0, 0);

      const end = new Date();
      end.setDate(end.getDate() + 7);
      end.setHours(23, 59, 59, 999);
      const expiringSubs = await this.prisma.tenantSubscription.findMany({
        where: {
          status: { in: ['ACTIVE', 'TRIAL'] },
          endDate: {
            gte: start,
            lte: end,
          },
          expiryReminderSentAt: null, // 👈 PREVENT DUPLICATES
        },

        include: {
          tenant: {
            include: {
              users: {
                where: { role: 'OWNER' },
              },
            },
          },
          plan: true,
        },
      });
      // 🧯 Daily hard limit
      const DAILY_EMAIL_LIMIT = 100;
      const subscriptionsToProcess = expiringSubs.slice(0, DAILY_EMAIL_LIMIT);

      if (expiringSubs.length > DAILY_EMAIL_LIMIT) {
      }

      for (const sub of subscriptionsToProcess) {
        const owner = sub.tenant.users[0];

        if (!owner?.email) {
          continue;
        }

        try {


          const module =
            sub.tenant.tenantType === 'GYM' ? 'GYM' : 'MOBILE_SHOP'; // simple map

          await this.eventEmitter.emitAsync(
            'subscription.trial.expiring',
            new SubscriptionTrialExpiringEvent(
              sub.tenantId,
              module as any,
              new Date(),
              sub,
              7, // days left (approximated for this logic, technically we queried range 0-7)
            ),
          );
          await this.prisma.tenantSubscription.update({
            where: { id: sub.id },
            data: {
              expiryReminderSentAt: new Date(),
            },
          });
          // ⏳ Respect Resend rate limits
          await this.sleep(600);
        } catch (err) {
          console.error(
            `[CRON][Expiry] Email FAILED for tenant ${sub.tenantId}`,
            err,
          );
        }
      }


    } finally {
      // 🔓 Always release lock
      this.isRunning = false;
    }
  }
}
