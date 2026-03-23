import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';

@Injectable()
export class TargetsService {
  constructor(private prisma: PrismaService) {}

  async getShopTargets(tenantId: string, shopId: string, year: number) {
    return this.prisma.shopTarget.findMany({
      where: { tenantId, shopId, year },
      orderBy: { month: 'asc' },
    });
  }

  async setShopTarget(
    tenantId: string,
    shopId: string,
    year: number,
    month: number,
    revenueTarget: number,
    repairTarget?: number,
    salesTarget?: number,
  ) {
    return this.prisma.shopTarget.upsert({
      where: { shopId_month_year: { shopId, month, year } },
      update: { revenueTarget, repairTarget, salesTarget, updatedAt: new Date() },
      create: { tenantId, shopId, month, year, revenueTarget, repairTarget, salesTarget },
    });
  }

  async getStaffTargets(tenantId: string, shopId: string, year: number) {
    return this.prisma.staffTarget.findMany({
      where: { tenantId, shopId, year },
      orderBy: [{ staffId: 'asc' }, { month: 'asc' }],
    });
  }

  async setStaffTarget(
    tenantId: string,
    shopId: string,
    staffId: string,
    year: number,
    month: number,
    revenueTarget: number,
    repairTarget?: number,
    salesTarget?: number,
  ) {
    return this.prisma.staffTarget.upsert({
      where: { staffId_month_year: { staffId, month, year } },
      update: { revenueTarget, repairTarget, salesTarget, updatedAt: new Date() },
      create: { tenantId, shopId, staffId, month, year, revenueTarget, repairTarget, salesTarget },
    });
  }

  /**
   * Leaderboard: returns staff targets for a given month with their aggregated
   * actual earnings — all in a single DB round-trip using groupBy.
   */
  async getLeaderboard(tenantId: string, shopId: string, month: number, year: number) {
    // Fetch targets and aggregate earnings in parallel
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth   = new Date(year, month, 1);

    const [targets, earningsByStaff] = await Promise.all([
      this.prisma.staffTarget.findMany({
        where: { tenantId, shopId, month, year },
      }),
      this.prisma.staffEarning.groupBy({
        by: ['staffId'],
        where: {
          tenantId,
          shopId,
          createdAt: { gte: startOfMonth, lt: endOfMonth },
        },
        _sum: { saleAmount: true, earned: true },
        _count: { id: true },
      }),
    ]);

    // Build a lookup map for O(1) access
    const earningsMap = new Map(
      earningsByStaff.map((e) => [e.staffId, {
        saleAmount: e._sum.saleAmount ?? 0,
        earned:     e._sum.earned ?? 0,
        count:      e._count.id,
      }])
    );

    // Resolve staff names from User table in one batch
    const staffIds = targets.map((t) => t.staffId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: staffIds } },
      select: { id: true, fullName: true, email: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    // Compose leaderboard rows
    const rows = targets.map((t) => {
      const earnings    = earningsMap.get(t.staffId);
      const revenueActual = earnings?.saleAmount ?? 0;
      const revenueTarget = Number(t.revenueTarget);
      const revenuePct  = revenueTarget > 0
        ? Math.min(100, Math.round((revenueActual / revenueTarget) * 100))
        : 0;

      return {
        staffId:      t.staffId,
        staffName:    userMap.get(t.staffId)?.fullName ?? 'Staff',
        revenueTarget,
        revenueActual,
        earnedTotal:  earnings?.earned ?? 0,
        invoiceCount: earnings?.count ?? 0,
        repairTarget: t.repairTarget,
        salesTarget:  t.salesTarget,
        revenuePct,
      };
    });

    // Sort by achievement %
    rows.sort((a, b) => b.revenuePct - a.revenuePct);
    return rows;
  }
}
