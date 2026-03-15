import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsageSnapshotService {
  private readonly logger = new Logger(UsageSnapshotService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Run daily at 1:00 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async handleDailySnapshot() {
    this.logger.log('📸 Starting daily usage snapshot...');
    const tenants = await this.prisma.tenant.findMany({
      select: { id: true },
    });

    for (const tenant of tenants) {
      try {
        await this.takeSnapshot(tenant.id);
      } catch (e) {
        this.logger.error(
          `Failed to take snapshot for tenant ${tenant.id}`,
          e.stack,
        );
      }
    }
    this.logger.log('✅ Daily usage snapshot completed.');
  }

  async takeSnapshot(tenantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Gather counts
    const activeMembers = await this.prisma.member.count({
      where: { tenantId, isActive: true },
    });

    const activeStaff = await this.prisma.userTenant.count({
      where: { tenantId, role: 'STAFF' },
    });

    const activeShops = await this.prisma.shop.count({
      where: { tenantId, isActive: true },
    });

    // 2. Save Snapshot
    await this.prisma.usageSnapshot.upsert({
      where: {
        tenantId_date: {
          tenantId,
          date: today,
        },
      },
      create: {
        tenantId,
        date: today,
        activeMembers,
        activeStaff,
        activeShops,
      },
      update: {
        activeMembers,
        activeStaff,
        activeShops,
      },
    });
  }

  async getHistory(tenantId: string, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.prisma.usageSnapshot.findMany({
      where: {
        tenantId,
        date: { gte: startDate },
      },
      orderBy: { date: 'asc' },
    });
  }
}
