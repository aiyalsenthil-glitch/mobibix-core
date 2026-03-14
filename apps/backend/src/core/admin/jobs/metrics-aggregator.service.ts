import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminCacheService } from '../cache/admin-cache.service';
import {
  startOfDay,
  endOfDay,
  subDays,
  startOfMonth,
  endOfMonth,
} from 'date-fns';
import { ModuleType, SubscriptionStatus, PaymentStatus } from '@prisma/client';
import { TEST_TENANT_CODES, toMonthlyPaise } from '../admin.constants';

@Injectable()
export class MetricsAggregatorService {
  private readonly logger = new Logger(MetricsAggregatorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: AdminCacheService,
  ) {}

  // ─── Daily Aggregation — runs at 00:05 UTC every day ──────────────────────
  @Cron('5 0 * * *')
  async runDailyAggregation() {
    const yesterday = subDays(new Date(), 1);
    this.logger.log(
      `Starting daily metrics aggregation for ${yesterday.toISOString().split('T')[0]}`,
    );

    try {
      await Promise.all([
        this.aggregateDailyRevenue(yesterday),
        this.computeAllTenantHealthScores(),
      ]);

      // Bust caches so dashboards refresh
      await Promise.all([
        this.cache.invalidate('admin:financials:mrr-summary'),
        this.cache.invalidate('admin:financials:mrr-waterfall'),
        this.cache.invalidate('admin:financials:invoice-aging'),
        this.cache.invalidate('admin:financials:revenue-by-plan'),
        this.cache.invalidate('admin:investor:summary'),
        this.cache.invalidate('admin:global:kpis'),
      ]);

      this.logger.log('✅ Daily metrics aggregation complete');
    } catch (err: any) {
      this.logger.error(`Daily aggregation failed: ${err.message}`, err.stack);
    }
  }

  // ─── Aggregate Daily Revenue Stats ────────────────────────────────────────

  async aggregateDailyRevenue(date: Date) {
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    for (const product of ['ALL', 'MOBIBIX', 'GYMPILOT']) {
      const moduleFilter =
        product === 'MOBIBIX'
          ? ModuleType.MOBILE_SHOP
          : product === 'GYMPILOT'
            ? ModuleType.GYM
            : undefined;

      const subWhere: any = {
        tenant: { code: { notIn: TEST_TENANT_CODES } },
      };
      if (moduleFilter) subWhere.module = moduleFilter;

      const [newSubs, cancelledSubs, activeSubs, payments] = await Promise.all([
        // New subscriptions started this day
        this.prisma.tenantSubscription.findMany({
          where: {
            ...subWhere,
            createdAt: { gte: dayStart, lte: dayEnd },
            status: { notIn: [SubscriptionStatus.TRIAL, SubscriptionStatus.CANCELLED] },
          },
          select: { priceSnapshot: true, billingCycle: true },
        }),
        // Subscriptions cancelled this day
        this.prisma.tenantSubscription.findMany({
          where: {
            ...subWhere,
            status: SubscriptionStatus.CANCELLED,
            updatedAt: { gte: dayStart, lte: dayEnd },
          },
          select: { priceSnapshot: true, billingCycle: true },
        }),
        // All active subscriptions at end of day (for running total)
        this.prisma.tenantSubscription.findMany({
          where: {
            ...subWhere,
            status: SubscriptionStatus.ACTIVE,
            createdAt: { lte: dayEnd },
          },
          select: { priceSnapshot: true, billingCycle: true },
        }),
        // Payments this day
        this.prisma.payment.groupBy({
          by: ['status'],
          where: {
            createdAt: { gte: dayStart, lte: dayEnd },
            ...(moduleFilter ? { module: moduleFilter } : {}),
            tenant: { code: { notIn: TEST_TENANT_CODES } },
          },
          _count: { id: true },
          _sum: { amount: true },
        }),
      ]);

      const newMrr = newSubs.reduce(
        (s, x) => s + toMonthlyPaise(x.priceSnapshot ?? 0, x.billingCycle),
        0,
      );
      const churnedMrr = cancelledSubs.reduce(
        (s, x) => s + toMonthlyPaise(x.priceSnapshot ?? 0, x.billingCycle),
        0,
      );
      const totalMrr = activeSubs.reduce(
        (s, x) => s + toMonthlyPaise(x.priceSnapshot ?? 0, x.billingCycle),
        0,
      );

      const successPay = payments.find((p) => p.status === PaymentStatus.SUCCESS);
      const failedPay = payments.find((p) => p.status === PaymentStatus.FAILED);

      // Count tenants
      const [newTenants, churnedTenants, activeTenants] = await Promise.all([
        this.prisma.tenant.count({
          where: {
            code: { notIn: TEST_TENANT_CODES },
            createdAt: { gte: dayStart, lte: dayEnd },
          },
        }),
        this.prisma.tenantSubscription.count({
          where: {
            ...subWhere,
            status: SubscriptionStatus.CANCELLED,
            updatedAt: { gte: dayStart, lte: dayEnd },
          },
        }),
        this.prisma.tenantSubscription.count({
          where: { ...subWhere, status: SubscriptionStatus.ACTIVE },
        }),
      ]);

      await (this.prisma as any).dailyRevenueStat.upsert({
        where: {
          date_product: { date: dayStart, product },
        },
        create: {
          date: dayStart,
          product,
          newMrr,
          churnedMrr,
          netMrr: newMrr - churnedMrr,
          totalMrr,
          newTenants,
          churnedTenants,
          activeTenants,
          successfulPayments: successPay?._count.id ?? 0,
          failedPayments: failedPay?._count.id ?? 0,
          paymentVolume: successPay?._sum.amount ?? 0,
        },
        update: {
          newMrr,
          churnedMrr,
          netMrr: newMrr - churnedMrr,
          totalMrr,
          newTenants,
          churnedTenants,
          activeTenants,
          successfulPayments: successPay?._count.id ?? 0,
          failedPayments: failedPay?._count.id ?? 0,
          paymentVolume: successPay?._sum.amount ?? 0,
        },
      });
    }
  }

  // ─── Tenant Health Score Computation ──────────────────────────────────────

  async computeAllTenantHealthScores() {
    const tenants = await this.prisma.tenant.findMany({
      where: { code: { notIn: TEST_TENANT_CODES } },
      select: {
        id: true,
        subscription: {
          where: { status: SubscriptionStatus.ACTIVE },
          select: { paymentStatus: true, status: true },
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    this.logger.log(`Computing health scores for ${tenants.length} tenants`);

    // Process in batches of 25 to avoid connection pool exhaustion
    const batchSize = 25;
    for (let i = 0; i < tenants.length; i += batchSize) {
      const batch = tenants.slice(i, i + batchSize);
      await Promise.all(batch.map((t) => this.computeHealthScore(t.id)));
    }
  }

  async computeHealthScore(tenantId: string) {
    const since30d = subDays(new Date(), 30);
    const since7d = subDays(new Date(), 7);

    const [sub, usageSnap, recentPayments] = await Promise.all([
      this.prisma.tenantSubscription.findFirst({
        where: { tenantId, status: SubscriptionStatus.ACTIVE },
        orderBy: { createdAt: 'desc' },
        select: { paymentStatus: true, status: true, endDate: true },
      }),
      this.prisma.usageSnapshot.findFirst({
        where: { tenantId, date: { gte: since7d } },
        orderBy: { date: 'desc' },
        select: { activeStaff: true, activeShops: true },
      }),
      this.prisma.payment.count({
        where: { tenantId, status: PaymentStatus.SUCCESS, createdAt: { gte: since30d } },
      }),
    ]);

    // Login score (0–25): proxy = active subscription exists with successful payment
    let loginScore = 0;
    if (sub) {
      loginScore = sub.paymentStatus === PaymentStatus.SUCCESS ? 25 : 10;
    }

    // Feature score (0–25): staff + shops as proxy for active usage
    const featureScore = usageSnap
      ? Math.min(((usageSnap.activeStaff ?? 0) + (usageSnap.activeShops ?? 0)) * 3, 25)
      : 5;

    // Revenue score (0–30): based on subscription status
    let revenueScore = 0;
    if (!sub) {
      revenueScore = 0;
    } else if (sub.status === SubscriptionStatus.ACTIVE && sub.paymentStatus === PaymentStatus.SUCCESS) {
      revenueScore = 30;
    } else if (sub.status === SubscriptionStatus.PAST_DUE) {
      revenueScore = 10;
    } else if (sub.status === SubscriptionStatus.EXPIRED) {
      revenueScore = 0;
    } else {
      revenueScore = 15;
    }

    // Activity score (0–20): successful payments as proxy for active business
    const activityScore = Math.min(recentPayments * 5, 20);

    const score = loginScore + featureScore + revenueScore + activityScore;

    const churnRisk =
      score >= 70
        ? 'LOW'
        : score >= 45
          ? 'MEDIUM'
          : score >= 25
            ? 'HIGH'
            : 'CRITICAL';

    await (this.prisma as any).tenantHealthScore.upsert({
      where: { tenantId },
      create: {
        tenantId,
        score,
        loginScore,
        featureScore,
        revenueScore,
        activityScore,
        churnRisk: churnRisk as any,
        computedAt: new Date(),
      },
      update: {
        score,
        loginScore,
        featureScore,
        revenueScore,
        activityScore,
        churnRisk: churnRisk as any,
        computedAt: new Date(),
      },
    });
  }

}
