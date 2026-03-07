import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { StaffInviteStatus } from '@prisma/client';

@Injectable()
export class InviteCleanupCron {
  private readonly logger = new Logger(InviteCleanupCron.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * DAILY: Mark pending invites as EXPIRED if they've passed their expiration date
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleInviteExpiration() {
    this.logger.log('Checking for expired staff invitations...');

    const result = await this.prisma.staffInvite.updateMany({
      where: {
        status: StaffInviteStatus.PENDING,
        expiresAt: {
          lt: new Date(),
        },
      },
      data: {
        status: StaffInviteStatus.EXPIRED,
      },
    });

    if (result.count > 0) {
      this.logger.log(`Automatically marked ${result.count} invitations as EXPIRED.`);
    }
  }

  /**
   * MONTHLY: Cleanup REJECTED or EXPIRED invites older than 90 days to keep DB lean
   */
  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async cleanupOldInvites() {
    this.logger.log('Cleaning up historical invitation data (90+ days old)...');

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const result = await this.prisma.staffInvite.deleteMany({
      where: {
        status: {
          in: [StaffInviteStatus.REJECTED, StaffInviteStatus.EXPIRED],
        },
        createdAt: {
          lt: ninetyDaysAgo,
        },
      },
    });

    if (result.count > 0) {
      this.logger.log(`Permanently removed ${result.count} old invitations for data hygiene.`);
    }
  }
}
