import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MemberExpiringEvent } from '../../../common/email/email.events';
import { ModuleType } from '@prisma/client';

@Injectable()
export class MemberExpiryCron {
  private readonly logger = new Logger(MemberExpiryCron.name);
  private isRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Runs daily at 10 AM
   * Checks for members expiring in exactly 3 days
   */
  @Cron('0 10 * * *')
  async handleMemberExpiry() {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      this.logger.log('[CRON][MemberExpiry] Starting check...');

      // Target: Members expiring in 3 days (e.g. today is 1st, expiring on 4th)
      const targetDateStart = new Date();
      targetDateStart.setDate(targetDateStart.getDate() + 3);
      targetDateStart.setHours(0, 0, 0, 0);

      const targetDateEnd = new Date(targetDateStart);
      targetDateEnd.setHours(23, 59, 59, 999);

      // Fetch active members in GYM tenants only
      const expiringMembers = await this.prisma.member.findMany({
        where: {
          isActive: true, // Only active ones
          membershipEndAt: {
            gte: targetDateStart,
            lte: targetDateEnd,
          },
          tenant: {
            tenantType: 'GYM', // Strict module scoping
          },
        },
        include: {
          tenant: true,
        },
      });

      this.logger.log(
        `[CRON][MemberExpiry] Found ${expiringMembers.length} members expiring on ${targetDateStart.toDateString()}`,
      );

      for (const member of expiringMembers) {
        // Emit event
        await this.eventEmitter.emitAsync(
          'member.expiring',
          new MemberExpiringEvent(
            member.tenantId,
            ModuleType.GYM,
            new Date(),
            member,
            member.membershipEndAt,
          ),
        );
      }
    } catch (error) {
      this.logger.error('[CRON][MemberExpiry] Failed', error);
    } finally {
      this.isRunning = false;
    }
  }
}
