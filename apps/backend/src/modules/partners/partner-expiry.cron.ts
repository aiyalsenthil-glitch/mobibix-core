import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PartnerStatus } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { PartnersService } from './partners.service';

/**
 * Runs daily to notify partners about shops whose subscriptions
 * are expiring within the next 7 days. Encourages follow-up.
 */
@Injectable()
export class PartnerExpiryCron {
  private readonly logger = new Logger(PartnerExpiryCron.name);
  private isRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly partnersService: PartnersService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async notifyExpiringSubscriptions() {
    if (this.isRunning) {
      this.logger.warn('Partner expiry cron already running, skipping');
      return;
    }
    try {
      this.isRunning = true;
      this.logger.log('Running partner expiry notification cron');

      const activePartners = await this.prisma.partner.findMany({
        where: { status: PartnerStatus.APPROVED },
        select: { id: true },
      });

      let totalNotified = 0;
      for (const partner of activePartners) {
        const count = await this.partnersService.notifyExpiringShops(partner.id);
        totalNotified += count;
      }

      this.logger.log(
        `Partner expiry cron done. Sent ${totalNotified} expiry notifications across ${activePartners.length} partners.`,
      );
    } catch (error) {
      this.logger.error('Partner expiry cron failed:', error);
    } finally {
      this.isRunning = false;
    }
  }
}
