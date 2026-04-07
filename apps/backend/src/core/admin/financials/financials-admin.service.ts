import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminCacheService } from '../cache/admin-cache.service';
import { startOfMonth, subMonths, endOfMonth, format, subDays } from 'date-fns';
import { ModuleType, SubscriptionStatus, PaymentStatus } from '@prisma/client';
import { TEST_TENANT_CODES, toMonthlyPaise } from '../admin.constants';

@Injectable()
export class FinancialsAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: AdminCacheService,
  ) {}

  // ─── MRR Summary ──────────────────────────────────────────────────────────

  async getMrrSummary() {
    return this.cache.getOrSet(
      'admin:financials:mrr-summary',
      async () => {
        const activeSubs = await this.prisma.tenantSubscription.findMany({
          where: {
            status: SubscriptionStatus.ACTIVE,
            tenant: { code: { notIn: TEST_TENANT_CODES } },
          },
          select: { priceSnapshot: true, billingCycle: true, module: true },
        });

        let totalMrr = 0;
        let mobibixMrr = 0;
        let mobibixMrr = 0;

        for (const sub of activeSubs) {
          const price = sub.priceSnapshot ?? 0;
          const monthly = toMonthlyPaise(price, sub.billingCycle);
          totalMrr += monthly;
          if (sub.module === ModuleType.MOBILE_SHOP) mobibixMrr += monthly;
          else if (sub.module === ModuleType.GYM) mobibixMrr += monthly;
        }

        // Last month MRR for delta
        const lastMonthSubs = await this.prisma.tenantSubscription.findMany({
          where: {
            status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.CANCELLED] },
            createdAt: { lt: startOfMonth(new Date()) },
            OR: [
              { endDate: { gte: startOfMonth(subMonths(new Date(), 1)) } },
              { status: SubscriptionStatus.ACTIVE },
            ],
            tenant: { code: { notIn: TEST_TENANT_CODES } },
          },
          select: { priceSnapshot: true, billingCycle: true },
        });

        let lastMonthMrr = 0;
        for (const sub of lastMonthSubs) {
          lastMonthMrr += toMonthlyPaise(
            sub.priceSnapshot ?? 0,
            sub.billingCycle,
          );
        }

        const mrrGrowthPct =
          lastMonthMrr > 0
            ? (((totalMrr - lastMonthMrr) / lastMonthMrr) * 100).toFixed(1)
            : '0.0';

        return {
          totalMrr,
          arrEstimate: totalMrr * 12,
          mobibixMrr,
          mobibixMrr,
          lastMonthMrr,
          mrrGrowthPct: parseFloat(mrrGrowthPct),
          activeSubs: activeSubs.length,
        };
      },
      300,
    );
  }

  // ─── MRR Waterfall (last 6 months) ────────────────────────────────────────

  async getMrrWaterfall() {
    return this.cache.getOrSet(
      'admin:financials:mrr-waterfall',
      async () => {
        const results: Array<{
          month: string; newMrr: number; expansionMrr: number;
          contractedMrr: number; churnedMrr: number; netMrr: number; totalMrr: number;
        }> = [];

        for (let i = 5; i >= 0; i--) {
          const monthStart = startOfMonth(subMonths(new Date(), i));
          const monthEnd = endOfMonth(subMonths(new Date(), i));

          // Pre-aggregated stat if available (new model — uses `as any` until client regenerates)
          const preAgg = await (this.prisma as any).dailyRevenueStat.findFirst({
            where: {
              date: { gte: monthStart, lte: monthEnd },
              product: 'ALL',
            },
            orderBy: { date: 'desc' },
          });

          if (preAgg) {
            results.push({
              month: format(monthStart, 'MMM yy'),
              newMrr: preAgg.newMrr,
              expansionMrr: preAgg.expansionMrr,
              contractedMrr: preAgg.contractedMrr,
              churnedMrr: preAgg.churnedMrr,
              netMrr: preAgg.netMrr,
              totalMrr: preAgg.totalMrr,
            });
            continue;
          }

          // Live computation fallback
          const [newSubs, cancelledSubs] = await Promise.all([
            this.prisma.tenantSubscription.findMany({
              where: {
                createdAt: { gte: monthStart, lte: monthEnd },
                status: { not: SubscriptionStatus.TRIAL },
                tenant: { code: { notIn: TEST_TENANT_CODES } },
              },
              select: { priceSnapshot: true, billingCycle: true },
            }),
            this.prisma.tenantSubscription.findMany({
              where: {
                status: SubscriptionStatus.CANCELLED,
                updatedAt: { gte: monthStart, lte: monthEnd },
                tenant: { code: { notIn: TEST_TENANT_CODES } },
              },
              select: { priceSnapshot: true, billingCycle: true },
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

          results.push({
            month: format(monthStart, 'MMM yy'),
            newMrr,
            expansionMrr: 0,
            contractedMrr: 0,
            churnedMrr,
            netMrr: newMrr - churnedMrr,
            totalMrr: 0, // requires running balance — filled by aggregator
          });
        }

        return results;
      },
      300,
    );
  }

  // ─── Failed Payments Tracker ──────────────────────────────────────────────

  async getFailedPayments(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [total, payments] = await Promise.all([
      this.prisma.payment.count({
        where: {
          status: { in: [PaymentStatus.FAILED, PaymentStatus.EXPIRED] },
          tenant: { code: { notIn: TEST_TENANT_CODES } },
        },
      }),
      this.prisma.payment.findMany({
        where: {
          status: { in: [PaymentStatus.FAILED, PaymentStatus.EXPIRED] },
          tenant: { code: { notIn: TEST_TENANT_CODES } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          amount: true,
          status: true,
          billingCycle: true,
          createdAt: true,
          providerOrderId: true,
          tenant: { select: { id: true, name: true, tenantType: true } },
        },
      }),
    ]);

    return {
      data: payments,
      meta: { total, page, lastPage: Math.ceil(total / limit) },
    };
  }

  // ─── Invoice Aging Report ─────────────────────────────────────────────────

  async getInvoiceAging() {
    return this.cache.getOrSet(
      'admin:financials:invoice-aging',
      async () => {
        const now = new Date();

        // Subscriptions that are PAST_DUE or EXPIRED with outstanding amounts
        const overdueRaw = await this.prisma.tenantSubscription.findMany({
          where: {
            status: { in: [SubscriptionStatus.PAST_DUE, SubscriptionStatus.EXPIRED, SubscriptionStatus.PENDING] },
            tenant: { code: { notIn: TEST_TENANT_CODES } },
          },
          select: {
            id: true,
            status: true,
            endDate: true,
            priceSnapshot: true,
            billingCycle: true,
            tenant: {
              select: { id: true, name: true, tenantType: true },
            },
          },
        });

        const buckets = {
          current: { count: 0, amount: 0, items: [] as any[] },
          days1_30: { count: 0, amount: 0, items: [] as any[] },
          days31_60: { count: 0, amount: 0, items: [] as any[] },
          days61_90: { count: 0, amount: 0, items: [] as any[] },
          over90: { count: 0, amount: 0, items: [] as any[] },
        };

        for (const sub of overdueRaw) {
          const daysOverdue = Math.floor(
            (now.getTime() - (sub.endDate?.getTime() ?? now.getTime())) / (1000 * 60 * 60 * 24),
          );
          const amount = sub.priceSnapshot ?? 0;
          const item = {
            tenantId: sub.tenant.id,
            tenantName: sub.tenant.name,
            amount,
            daysOverdue,
            status: sub.status,
            endDate: sub.endDate,
          };

          if (daysOverdue <= 0) {
            buckets.current.count++;
            buckets.current.amount += amount;
            buckets.current.items.push(item);
          } else if (daysOverdue <= 30) {
            buckets.days1_30.count++;
            buckets.days1_30.amount += amount;
            buckets.days1_30.items.push(item);
          } else if (daysOverdue <= 60) {
            buckets.days31_60.count++;
            buckets.days31_60.amount += amount;
            buckets.days31_60.items.push(item);
          } else if (daysOverdue <= 90) {
            buckets.days61_90.count++;
            buckets.days61_90.amount += amount;
            buckets.days61_90.items.push(item);
          } else {
            buckets.over90.count++;
            buckets.over90.amount += amount;
            buckets.over90.items.push(item);
          }
        }

        const totalOverdue =
          buckets.days1_30.amount +
          buckets.days31_60.amount +
          buckets.days61_90.amount +
          buckets.over90.amount;

        return { buckets, totalOverdue, totalRecords: overdueRaw.length };
      },
      300,
    );
  }

  // ─── Revenue by Plan ──────────────────────────────────────────────────────

  async getRevenueByPlan() {
    return this.cache.getOrSet(
      'admin:financials:revenue-by-plan',
      async () => {
        const subs = await this.prisma.tenantSubscription.findMany({
          where: {
            status: SubscriptionStatus.ACTIVE,
            tenant: { code: { notIn: TEST_TENANT_CODES } },
          },
          select: {
            priceSnapshot: true,
            billingCycle: true,
            plan: { select: { name: true, code: true } },
          },
        });

        const planMap: Record<
          string,
          { name: string; mrr: number; tenants: number }
        > = {};

        for (const sub of subs) {
          const key = sub.plan.code;
          if (!planMap[key]) {
            planMap[key] = { name: sub.plan.name, mrr: 0, tenants: 0 };
          }
          planMap[key].mrr += toMonthlyPaise(
            sub.priceSnapshot ?? 0,
            sub.billingCycle,
          );
          planMap[key].tenants++;
        }

        return Object.values(planMap).sort((a, b) => b.mrr - a.mrr);
      },
      300,
    );
  }

  // ─── Payment Volume (last 30 days) ────────────────────────────────────────

  async getPaymentVolume() {
    return this.cache.getOrSet(
      'admin:financials:payment-volume',
      async () => {
        const since = subDays(new Date(), 30);

        const payments = await this.prisma.payment.groupBy({
          by: ['status'],
          where: {
            createdAt: { gte: since },
            tenant: { code: { notIn: TEST_TENANT_CODES } },
          },
          _count: { id: true },
          _sum: { amount: true },
        });

        const result: Record<
          string,
          { count: number; amount: number }
        > = {};
        for (const p of payments) {
          result[p.status] = {
            count: p._count.id,
            amount: p._sum.amount ?? 0,
          };
        }

        return result;
      },
      120,
    );
  }

}
