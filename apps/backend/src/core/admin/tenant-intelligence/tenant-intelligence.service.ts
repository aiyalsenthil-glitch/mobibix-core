import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminCacheService } from '../cache/admin-cache.service';
import { subDays } from 'date-fns';
import { SubscriptionStatus, PaymentStatus } from '@prisma/client';
import { TEST_TENANT_CODES as TEST_CODES, toMonthlyPaise } from '../admin.constants';

@Injectable()
export class TenantIntelligenceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: AdminCacheService,
  ) {}

  // ─── All tenants with health scores (paginated) ────────────────────────────

  async getTenantScores(opts: {
    page: number;
    limit: number;
    search?: string;
    churnRisk?: string;
    product?: string;
  }) {
    const { page, limit, search, churnRisk, product } = opts;
    const skip = (page - 1) * limit;

    const where: any = {
      code: { notIn: TEST_CODES },
    };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (product === 'MOBIBIX') where.tenantType = 'MOBILE_SHOP';
    if (product === 'GYMPILOT') where.tenantType = 'GYM';

    const healthScoreWhere: any = {};
    if (churnRisk) healthScoreWhere.churnRisk = churnRisk;

    const [total, tenants] = await Promise.all([
      this.prisma.tenant.count({ where }),
      this.prisma.tenant.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          contactEmail: true,
          tenantType: true,
          createdAt: true,
          subscription: {
            where: { status: SubscriptionStatus.ACTIVE },
            take: 1,
            orderBy: { createdAt: 'desc' },
            select: {
              priceSnapshot: true,
              billingCycle: true,
              status: true,
              endDate: true,
              plan: { select: { name: true, code: true } },
            },
          },
        },
      }),
    ]);

    // Fetch health scores separately (new model — requires fresh Prisma client)
    const tenantIds = tenants.map((t) => t.id);
    const healthScores = await (this.prisma as any).tenantHealthScore.findMany({
      where: { tenantId: { in: tenantIds } },
      select: {
        tenantId: true, score: true, churnRisk: true,
        loginScore: true, featureScore: true, revenueScore: true,
        activityScore: true, computedAt: true,
      },
    }).catch(() => [] as any[]);

    const hsMap = new Map(
      (healthScores as any[]).map((h: any) => [h.tenantId, h]),
    );

    const rows = tenants
      .filter((t) => {
        if (!churnRisk) return true;
        const hs = hsMap.get(t.id) as any;
        return (hs?.churnRisk ?? 'MEDIUM') === churnRisk;
      })
      .map((t) => {
        const sub = t.subscription[0] ?? null;
        const hs = hsMap.get(t.id) as any ?? null;
        const mrr = sub
          ? toMonthlyPaise(sub.priceSnapshot ?? 0, sub.billingCycle)
          : 0;
        return {
          id: t.id,
          name: t.name,
          email: t.contactEmail,
          product: t.tenantType,
          plan: sub?.plan?.name ?? '—',
          mrr,
          healthScore: hs?.score ?? null,
          churnRisk: hs?.churnRisk ?? 'MEDIUM',
          scoreBreakdown: hs
            ? { login: hs.loginScore, feature: hs.featureScore, revenue: hs.revenueScore, activity: hs.activityScore }
            : null,
          subStatus: sub?.status ?? 'NO_SUB',
          subEndsAt: sub?.endDate ?? null,
          createdAt: t.createdAt,
          scoreComputedAt: hs?.computedAt ?? null,
        };
      });

    return {
      data: rows,
      meta: { total, page, limit, lastPage: Math.ceil(total / limit) },
    };
  }

  // ─── Churn risk list (HIGH + CRITICAL, sorted by MRR impact) ──────────────

  async getChurnRisks() {
    return this.cache.getOrSet(
      'admin:tenant-intel:churn-risks',
      async () => {
        const db = this.prisma as any;
        const at_risk = await db.tenantHealthScore.findMany({
          where: { churnRisk: { in: ['HIGH', 'CRITICAL'] } },
          orderBy: [{ churnRisk: 'desc' }, { score: 'asc' }],
          take: 50,
          select: {
            tenantId: true,
            score: true,
            churnRisk: true,
            loginScore: true,
            featureScore: true,
            revenueScore: true,
            activityScore: true,
            computedAt: true,
            tenant: {
              select: {
                name: true,
                contactEmail: true,
                tenantType: true,
                createdAt: true,
                subscription: {
                  where: { status: SubscriptionStatus.ACTIVE },
                  take: 1,
                  orderBy: { createdAt: 'desc' },
                  select: {
                    priceSnapshot: true,
                    billingCycle: true,
                    endDate: true,
                    plan: { select: { name: true } },
                  },
                },
              },
            },
          },
        });

        return (at_risk as any[]).map((hs: any) => {
          const sub = hs.tenant.subscription[0] ?? null;
          const mrr = sub
            ? toMonthlyPaise(sub.priceSnapshot ?? 0, sub.billingCycle)
            : 0;
          return {
            tenantId: hs.tenantId,
            name: hs.tenant.name,
            email: hs.tenant.contactEmail,
            product: hs.tenant.tenantType,
            plan: sub?.plan?.name ?? '—',
            mrr,
            score: hs.score,
            churnRisk: hs.churnRisk,
            breakdown: {
              login: hs.loginScore,
              feature: hs.featureScore,
              revenue: hs.revenueScore,
              activity: hs.activityScore,
            },
            subEndsAt: sub?.endDate ?? null,
            tenantAge: Math.floor(
              (Date.now() - hs.tenant.createdAt.getTime()) /
                (1000 * 60 * 60 * 24),
            ),
            computedAt: hs.computedAt,
          };
        });
      },
      300,
    );
  }

  // ─── Tenant health distribution summary ────────────────────────────────────

  async getHealthDistribution() {
    return this.cache.getOrSet(
      'admin:tenant-intel:health-dist',
      async () => {
        const db = this.prisma as any;
        const [low, medium, high, critical, unscored] = await Promise.all([
          db.tenantHealthScore.count({ where: { churnRisk: 'LOW' } }),
          db.tenantHealthScore.count({ where: { churnRisk: 'MEDIUM' } }),
          db.tenantHealthScore.count({ where: { churnRisk: 'HIGH' } }),
          db.tenantHealthScore.count({ where: { churnRisk: 'CRITICAL' } }),
          this.prisma.tenant.count({
            where: {
              code: { notIn: TEST_CODES },
              healthScore: null,
            },
          }),
        ]);

        const avgResult = await db.tenantHealthScore.aggregate({
          _avg: { score: true },
        });

        return {
          LOW: low,
          MEDIUM: medium,
          HIGH: high,
          CRITICAL: critical,
          UNSCORED: unscored,
          avgScore: Math.round(avgResult._avg.score ?? 0),
          total: low + medium + high + critical + unscored,
        };
      },
      300,
    );
  }

  // ─── Single tenant intelligence profile ───────────────────────────────────

  async getTenantProfile(tenantId: string) {
    const since30d = subDays(new Date(), 30);

    const db = this.prisma as any;
    const [tenant, healthScore, recentPayments, usageHistory] =
      await Promise.all([
        this.prisma.tenant.findUniqueOrThrow({
          where: { id: tenantId },
          select: {
            id: true,
            name: true,
            contactEmail: true,
            tenantType: true,
            createdAt: true,
            subscription: {
              orderBy: { createdAt: 'desc' },
              take: 5,
              select: {
                status: true,
                startDate: true,
                endDate: true,
                priceSnapshot: true,
                billingCycle: true,
                plan: { select: { name: true, code: true } },
              },
            },
          },
        }),
        db.tenantHealthScore.findUnique({ where: { tenantId } }).catch(() => null),
        this.prisma.payment.findMany({
          where: { tenantId, createdAt: { gte: since30d } },
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            amount: true,
            status: true,
            billingCycle: true,
            createdAt: true,
          },
        }),
        this.prisma.usageSnapshot.findMany({
          where: { tenantId },
          orderBy: { date: 'desc' },
          take: 30,
          select: { date: true, activeStaff: true, activeShops: true },
        }),
      ]);

    const activeSub = tenant.subscription.find((s) => s.status === SubscriptionStatus.ACTIVE);
    const ltv = recentPayments
      .filter((p) => p.status === PaymentStatus.SUCCESS)
      .reduce((s, p) => s + p.amount, 0);

    return {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        email: tenant.contactEmail,
        product: tenant.tenantType,
        createdAt: tenant.createdAt,
        tenantAgeDays: Math.floor(
          (Date.now() - tenant.createdAt.getTime()) / (1000 * 60 * 60 * 24),
        ),
      },
      healthScore,
      activePlan: activeSub
        ? {
            name: activeSub.plan.name,
            mrr: toMonthlyPaise(
              activeSub.priceSnapshot ?? 0,
              activeSub.billingCycle,
            ),
            status: activeSub.status,
            endsAt: activeSub.endDate,
          }
        : null,
      subscriptionHistory: tenant.subscription,
      recentPayments,
      usageHistory,
      ltv30d: ltv,
    };
  }

  // ─── Feature Adoption Heatmap ──────────────────────────────────────────────

  async getFeatureAdoption(dateRange: '7d' | '30d' | '90d' = '30d', product?: string) {
    return this.cache.getOrSet(
      `admin:tenant-intel:feature-adoption:${dateRange}:${product ?? 'ALL'}`,
      async () => {
        const days = dateRange === '7d' ? 7 : dateRange === '90d' ? 90 : 30;
        const since = subDays(new Date(), days);

        const tenantWhere: any = { code: { notIn: TEST_CODES } };
        if (product === 'MOBIBIX') tenantWhere.tenantType = 'MOBILE_SHOP';
        if (product === 'GYMPILOT') tenantWhere.tenantType = 'GYM';

        const tenants = await this.prisma.tenant.findMany({
          where: tenantWhere,
          select: { id: true, name: true, tenantType: true },
          take: 100,
        });

        const mobibixIds = tenants.filter(t => t.tenantType === 'MOBILE_SHOP').map(t => t.id);
        const gymIds = tenants.filter(t => t.tenantType === 'GYM').map(t => t.id);

        // Parallel groupBy queries — one per feature, returns count per tenantId
        const [jobCards, invoices, stockOps, grns, memberships, attendance] = await Promise.all([
          mobibixIds.length
            ? this.prisma.jobCard.groupBy({ by: ['tenantId'], where: { tenantId: { in: mobibixIds }, createdAt: { gte: since } }, _count: { id: true } })
            : Promise.resolve([]),
          mobibixIds.length
            ? this.prisma.invoice.groupBy({ by: ['tenantId'], where: { tenantId: { in: mobibixIds }, createdAt: { gte: since } }, _count: { id: true } })
            : Promise.resolve([]),
          mobibixIds.length
            ? this.prisma.stockLedger.groupBy({ by: ['tenantId'], where: { tenantId: { in: mobibixIds }, createdAt: { gte: since } }, _count: { id: true } })
            : Promise.resolve([]),
          mobibixIds.length
            ? (this.prisma as any).gRN.groupBy({ by: ['tenantId'], where: { tenantId: { in: mobibixIds }, receivedDate: { gte: since } }, _count: { id: true } })
            : Promise.resolve([]),
          gymIds.length
            ? this.prisma.gymMembership.groupBy({ by: ['tenantId'], where: { tenantId: { in: gymIds }, createdAt: { gte: since } }, _count: { id: true } })
            : Promise.resolve([]),
          gymIds.length
            ? this.prisma.gymAttendance.groupBy({ by: ['tenantId'], where: { tenantId: { in: gymIds }, checkInTime: { gte: since } }, _count: { id: true } })
            : Promise.resolve([]),
        ]);

        const toMap = (rows: any[]) =>
          new Map((rows as any[]).map((r: any) => [r.tenantId, r._count.id]));

        const jcMap = toMap(jobCards);
        const invMap = toMap(invoices);
        const stockMap = toMap(stockOps);
        const grnMap = toMap(grns);
        const memMap = toMap(memberships);
        const attMap = toMap(attendance);

        const MOBIBIX_FEATURES = ['jobCards', 'invoicing', 'stockManagement', 'procurement'] as const;
        const GYM_FEATURES = ['memberships', 'attendance'] as const;

        const rows = tenants.map(t => {
          const isMobibix = t.tenantType === 'MOBILE_SHOP';
          const features: Record<string, number> = isMobibix
            ? {
                jobCards: jcMap.get(t.id) ?? 0,
                invoicing: invMap.get(t.id) ?? 0,
                stockManagement: stockMap.get(t.id) ?? 0,
                procurement: grnMap.get(t.id) ?? 0,
              }
            : {
                memberships: memMap.get(t.id) ?? 0,
                attendance: attMap.get(t.id) ?? 0,
              };

          const featureKeys = Object.keys(features);
          const adoptedCount = featureKeys.filter(k => features[k] > 0).length;
          return {
            tenantId: t.id,
            name: t.name,
            product: t.tenantType,
            features,
            adoptedFeatures: adoptedCount,
            totalFeatures: featureKeys.length,
            adoptionPct: Math.round((adoptedCount / featureKeys.length) * 100),
          };
        });

        // Per-feature adoption summary across all matching tenants
        const mobibixRows = rows.filter(r => r.product === 'MOBILE_SHOP');
        const gymRows = rows.filter(r => r.product === 'GYM');

        const featureSummary: Record<string, { adopted: number; total: number; adoptionRate: number }> = {};
        for (const f of MOBIBIX_FEATURES) {
          const adopted = mobibixRows.filter(r => (r.features[f] ?? 0) > 0).length;
          featureSummary[f] = { adopted, total: mobibixRows.length, adoptionRate: mobibixRows.length ? Math.round((adopted / mobibixRows.length) * 100) : 0 };
        }
        for (const f of GYM_FEATURES) {
          const adopted = gymRows.filter(r => (r.features[f] ?? 0) > 0).length;
          featureSummary[f] = { adopted, total: gymRows.length, adoptionRate: gymRows.length ? Math.round((adopted / gymRows.length) * 100) : 0 };
        }

        return { rows, featureSummary, dateRange, totalTenants: tenants.length };
      },
      180,
    );
  }

}
