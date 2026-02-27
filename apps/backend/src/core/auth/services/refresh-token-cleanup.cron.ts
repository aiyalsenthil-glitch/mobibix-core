import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Cleans up expired and revoked RefreshTokens weekly.
 * Without this, the RefreshToken table grows unboundedly.
 *
 * Retention policy:
 * - EXPIRED tokens: delete immediately after expiry
 * - REVOKED tokens: retain for 30 days (for audit trail), then delete
 */
@Injectable()
export class RefreshTokenCleanupCron {
  private readonly logger = new Logger(RefreshTokenCleanupCron.name);

  constructor(private readonly prisma: PrismaService) {}

  // Every Sunday at 3:00 AM
  @Cron('0 3 * * 0')
  async cleanupStaleTokens() {
    this.logger.log('[CRON][RefreshTokenCleanup] Starting cleanup job');

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    try {
      // 1. Delete tokens that have expired
      const expiredResult = await this.prisma.refreshToken.deleteMany({
        where: {
          expiresAt: { lt: now },
        },
      });

      // 2. Delete revoked tokens older than 30 days (audit window)
      const revokedResult = await this.prisma.refreshToken.deleteMany({
        where: {
          revokedAt: { lt: thirtyDaysAgo },
        },
      });

      this.logger.log(
        `[CRON][RefreshTokenCleanup] Done — expired: ${expiredResult.count}, old-revoked: ${revokedResult.count}`,
      );
    } catch (err) {
      this.logger.error('[CRON][RefreshTokenCleanup] Cleanup failed', err);
    }
  }
}
