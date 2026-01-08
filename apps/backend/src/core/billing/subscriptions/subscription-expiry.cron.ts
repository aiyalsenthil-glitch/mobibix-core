import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../../common/email';

@Injectable()
export class SubscriptionExpiryCron {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
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
      console.log('[CRON][Expiry] Previous job still running, skipping');
      return;
    }

    this.isRunning = true;

    try {
      console.log('[CRON][Expiry] Job started');

      // 📅 RANGE window: today → next 7 days
      const start = new Date();
      start.setHours(0, 0, 0, 0);

      const end = new Date();
      end.setDate(end.getDate() + 7);
      end.setHours(23, 59, 59, 999);

      console.log(
        `[CRON][Expiry] Checking subscriptions expiring between ${start.toISOString()} and ${end.toISOString()}`,
      );

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

      console.log(
        `[CRON][Expiry] Matching subscriptions: ${expiringSubs.length}`,
      );

      // 🧯 Daily hard limit
      const DAILY_EMAIL_LIMIT = 100;
      const subscriptionsToProcess = expiringSubs.slice(0, DAILY_EMAIL_LIMIT);

      if (expiringSubs.length > DAILY_EMAIL_LIMIT) {
        console.warn(
          `[CRON][Expiry] ${expiringSubs.length} subscriptions found, limiting to ${DAILY_EMAIL_LIMIT} emails today`,
        );
      }

      for (const sub of subscriptionsToProcess) {
        console.log(
          `[CRON][Expiry] Processing subscription ${sub.id} | endDate=${sub.endDate.toISOString()}`,
        );

        const owner = sub.tenant.users[0];

        if (!owner?.email) {
          console.log(
            `[CRON][Expiry] Skipping subscription ${sub.id} — owner email missing`,
          );
          continue;
        }

        try {
          console.log(`[CRON][Expiry] Sending expiry email to ${owner.email}`);

          await this.emailService.sendEmail({
            to: owner.email,
            subject: 'Your GymPilot plan expires soon ⏰',
            html: `
              <h3>Plan Expiry Reminder</h3>
              <p>Your <b>${sub.plan.name}</b> plan will expire on
              <b>${sub.endDate.toDateString()}</b>.</p>
              <p>Please renew or upgrade to avoid service interruption.</p>
              <br/>
              <p>— Team GymPilot</p>
            `,
          });
          await this.prisma.tenantSubscription.update({
            where: { id: sub.id },
            data: {
              expiryReminderSentAt: new Date(),
            },
          });

          console.log(
            `[CRON][Expiry] Email sent to ${owner.email} (tenant ${sub.tenantId})`,
          );

          // ⏳ Respect Resend rate limits
          await this.sleep(600);
        } catch (err) {
          console.error(
            `[CRON][Expiry] Email FAILED for tenant ${sub.tenantId}`,
            err,
          );
        }
      }

      console.log('[CRON][Expiry] Job finished');
    } finally {
      // 🔓 Always release lock
      this.isRunning = false;
    }
  }
}
