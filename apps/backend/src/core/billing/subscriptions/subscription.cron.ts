import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SubscriptionCron {
  constructor(private readonly prisma: PrismaService) {}

  // Runs every night at 1 AM
  @Cron('0 1 * * *')
  async expireTrials() {
    const now = new Date();

    await this.prisma.tenantSubscription.updateMany({
      where: {
        status: 'TRIAL',
        endDate: { lt: now },
      },
      data: {
        status: 'EXPIRED',
      },
    });
  }
}
