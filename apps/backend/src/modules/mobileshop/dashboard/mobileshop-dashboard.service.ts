import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { StockKpiService } from '../../../core/stock/stock-kpi.service';

@Injectable()
export class MobileShopDashboardService {
  constructor(
    private prisma: PrismaService,
    private stockKpiService: StockKpiService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async getOwnerDashboard(
    tenantId: string,
    shopId?: string,
    skipCache = false,
  ) {
    // 🔴 CHECK CACHE FIRST
    const cacheVersion = process.env.CACHE_VERSION || '1';
    const cacheKey = `v${cacheVersion}:dashboard:owner:${tenantId}:${shopId || 'all'}`;

    if (!skipCache) {
      const cached = await this.cacheManager.get<any>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Rest of the method continues below...
    // 1️⃣ Resolve shops
    const shops = await this.prisma.shop.findMany({
      where: {
        tenantId,
        ...(shopId ? { id: shopId } : {}),
      },
      select: { id: true },
    });
    const shopIds = shops.map((s) => s.id);

    // No shops yet → return empty dashboard instead of 400/500
    if (shopIds.length === 0) {
      return {
        today: { salesAmount: 0, jobsReceived: 0 },
        month: { salesAmount: 0, invoiceCount: 0 },
        inventory: {
          totalProducts: 0,
          negativeStockCount: 0,
          deadStockCount: 0,
          fastMoving: [],
        },
        repairs: {
          inProgress: 0,
          waitingForParts: 0,
          ready: 0,
          deliveredToday: 0,
        },
        alerts: { negativeStock: [], deadStock: [] },
        empty: true,
        message: 'No shops found. Create a shop to start using the dashboard.',
        createShopUrl: '/mobileshop/shops',
      };
    }

    // -------------------------
    // PARALLEL QUERIES (optimized)
    // -------------------------
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    // 🚀 Run ALL queries in parallel to minimize total latency
    const [
      salesToday,
      jobsReceivedToday,
      monthSales,
      totalProducts,
      inventoryKpi,
      jobCardStats,
      whatsappSentCount,
      whatsappDeliveredCount,
      monthSalesAgg,
      paidSalesAgg,
      repairDocs,
      lastMonthSalesAgg,
    ] = await Promise.all([
      // Today's sales
      this.prisma.invoice.aggregate({
        where: {
          tenantId,
          shopId: { in: shopIds },
          createdAt: { gte: today },
          deletedAt: null,
          status: { not: 'VOIDED' },
        },
        _sum: { totalAmount: true },
      }),
      // Today's job cards
      this.prisma.jobCard.count({
        where: {
          tenantId,
          shopId: { in: shopIds },
          createdAt: { gte: today },
          deletedAt: null,
        },
      }),
      // Month sales
      this.prisma.invoice.aggregate({
        where: {
          tenantId,
          shopId: { in: shopIds },
          createdAt: { gte: monthStart },
          deletedAt: null,
          status: { not: 'VOIDED' },
        },
        _sum: { totalAmount: true },
        _count: { id: true },
      }),
      // Product count
      this.prisma.shopProduct.count({
        where: {
          tenantId,
          shopId: { in: shopIds },
          isActive: true,
        },
      }),
      // Inventory KPI (stock movements, fast/dead stock, negatives)
      this.stockKpiService.overview(
        tenantId,
        shopId ?? shopIds[0],
        'MONTH',
        30,
      ),
      // Repair pipeline counts (batched in single query with groupBy)
      this.prisma.jobCard.groupBy({
        by: ['status'],
        where: {
          tenantId,
          shopId: { in: shopIds },
          deletedAt: null,
        },
        _count: true,
      }),
      // 📱 VALUE SNAPSHOT: WhatsApp Stats
      this.prisma.whatsAppLog.count({
        where: { tenantId, sentAt: { gte: monthStart } },
      }),
      this.prisma.whatsAppLog.count({
        where: { tenantId, sentAt: { gte: monthStart }, status: 'DELIVERED' },
      }),
      // 💳 VALUE SNAPSHOT: Collection Rate (Invoices Paid vs Total this month)
      this.prisma.invoice.aggregate({
        where: {
          tenantId,
          shopId: { in: shopIds },
          createdAt: { gte: monthStart },
          deletedAt: null,
          status: { not: 'VOIDED' },
        },
        _sum: { totalAmount: true },
      }),
      this.prisma.invoice.aggregate({
        where: {
          tenantId,
          shopId: { in: shopIds },
          createdAt: { gte: monthStart },
          status: 'PAID',
          deletedAt: null,
        },
        _sum: { totalAmount: true },
      }),
      // 🔧 VALUE SNAPSHOT: Repair Turnaround (Avg days RECEIVED -> DELIVERED)
      this.prisma.jobCard.findMany({
        where: {
          tenantId,
          shopId: { in: shopIds },
          status: 'DELIVERED',
          updatedAt: { gte: monthStart },
          deletedAt: null,
        },
        select: { createdAt: true, updatedAt: true },
      }),
      // 📊 TRENDS: Last Month Sales
      this.prisma.invoice.aggregate({
        where: {
          tenantId,
          shopId: { in: shopIds },
          createdAt: {
            gte: new Date(
              monthStart.getFullYear(),
              monthStart.getMonth() - 1,
              1,
            ),
            lt: monthStart,
          },
          status: { not: 'VOIDED' },
        },
        _sum: { totalAmount: true },
      }),
    ]);

    const lastMonthSalesAmount =
      (lastMonthSalesAgg._sum?.totalAmount ?? 0) / 100;

    // 📱 WHATSAPP RECOVERY: Correlation (Invoice within 48h of WhatsApp)
    const thisMonthInvoices = await this.prisma.invoice.findMany({
      where: {
        tenantId,
        shopId: { in: shopIds },
        createdAt: { gte: monthStart },
        status: 'PAID',
      },
      select: { totalAmount: true, customerId: true, createdAt: true },
    });

    // Fetch relevant WhatsApp logs once
    const whatsappLogs = await this.prisma.whatsAppLog.findMany({
      where: {
        tenantId,
        sentAt: { gte: new Date(monthStart.getTime() - 48 * 60 * 60 * 1000) },
      },
      select: { customerId: true, sentAt: true },
    });

    // Index WhatsApp logs by customerId for O(1) lookup
    const logsByCustomer = new Map<string, number[]>();
    for (const log of whatsappLogs) {
      if (!log.customerId) continue;
      const logs = logsByCustomer.get(log.customerId) || [];
      logs.push(log.sentAt.getTime());
      logsByCustomer.set(log.customerId, logs);
    }

    let whatsappRecoveryAmount = 0;
    const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

    for (const inv of thisMonthInvoices) {
      if (!inv.customerId) continue;

      const customerLogs = logsByCustomer.get(inv.customerId);
      if (!customerLogs) continue;

      const invTime = inv.createdAt.getTime();
      const windowStart = invTime - FORTY_EIGHT_HOURS_MS;

      const hasReminder = customerLogs.some(
        (sentTime) => sentTime >= windowStart && sentTime <= invTime
      );

      if (hasReminder) {
        whatsappRecoveryAmount += inv.totalAmount;
      }
    }
    const whatsappRecoverySales = whatsappRecoveryAmount / 100;

    const whatsappSent = whatsappSentCount;
    const whatsappDelivered = whatsappDeliveredCount;

    const totalInvAmount = monthSalesAgg._sum?.totalAmount ?? 0;
    const paidInvAmount = paidSalesAgg._sum?.totalAmount ?? 0;
    const collectionRate =
      totalInvAmount > 0
        ? Math.round((paidInvAmount / totalInvAmount) * 100)
        : 100;

    const turnaroundDaysArr = repairDocs.map((r) => {
      const diff = r.updatedAt.getTime() - r.createdAt.getTime();
      return diff / (1000 * 60 * 60 * 24);
    });
    const repairTurnaroundDays =
      turnaroundDaysArr.length > 0
        ? (
            turnaroundDaysArr.reduce((a, b) => a + b, 0) /
            turnaroundDaysArr.length
          ).toFixed(1)
        : '0';

    // Parse repair pipeline from groupBy result
    const jobCardMap = new Map(
      jobCardStats.map((stat) => [stat.status, stat._count]),
    );
    const inProgress = jobCardMap.get('IN_PROGRESS') ?? 0;
    const waitingForParts = jobCardMap.get('WAITING_FOR_PARTS') ?? 0;
    const ready = jobCardMap.get('READY') ?? 0;

    // Count delivered today (need separate query for timestamp check)
    // Count delivered today (need separate query for timestamp check)
    const deliveredToday = await this.prisma.jobCard.count({
      where: {
        tenantId,
        shopId: { in: shopIds },
        status: 'DELIVERED',
        updatedAt: { gte: today },
      },
    });

    // 🔹 NEW: PAYMENT DISTRIBUTION (aggregated)
    const paymentStatsRaw = await this.prisma.invoice.groupBy({
      by: ['paymentMode'],
      where: {
        tenantId,
        shopId: { in: shopIds },
        createdAt: { gte: today }, // Stats for TODAY only? Or Month? Frontend was using same date range as sales report context.
        // Frontend call: getSalesReport({ startDate: startStr, endDate: endStr }) -> Today!
      },
      _sum: { totalAmount: true },
    });

    const paymentStats = paymentStatsRaw.map((stat) => ({
      name: stat.paymentMode,
      value: (stat._sum.totalAmount ?? 0) / 100,
    }));

    // 📊 TRENDS: Sales Trend (Last 7 days)
    const trendStart = new Date();
    trendStart.setDate(trendStart.getDate() - 7);
    trendStart.setHours(0, 0, 0, 0);

    // Using groupBy + in-memory date splitting for PostgreSQL (Prisma doesn't support DATE_TRUNC)
    // For small-medium volume, fetching daily field and grouping is better than findMany on all data
    const salesTrendRaw = await this.prisma.invoice.groupBy({
      by: ['createdAt'],
      where: {
        tenantId,
        shopId: { in: shopIds },
        createdAt: { gte: trendStart },
        deletedAt: null,
      },
      _sum: { totalAmount: true },
    });

    const trendMap = new Map<string, number>();
    salesTrendRaw.forEach((stat) => {
      const dateKey = stat.createdAt.toISOString().split('T')[0];
      const amount = (stat._sum.totalAmount ?? 0) / 100;
      trendMap.set(dateKey, (trendMap.get(dateKey) ?? 0) + amount);
    });

    const salesTrend: { date: string; sales: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      const displayDate = d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      salesTrend.push({
        date: displayDate,
        sales: Math.round((trendMap.get(dateKey) ?? 0) * 100) / 100,
      });
    }

    // =========================
    // 🔹 FINAL RESPONSE
    // =========================
    const response = {
      today: {
        salesAmount: (salesToday._sum.totalAmount ?? 0) / 100,
        jobsReceived: jobsReceivedToday,
      },

      month: {
        salesAmount: (monthSales._sum.totalAmount ?? 0) / 100,
        invoiceCount: monthSales._count.id,
      },

      inventory: {
        totalProducts,
        negativeStockCount: inventoryKpi.lowStock.length, // Use Low Stock (Stock <= Reorder) instead of Negative
        deadStockCount: inventoryKpi.deadStock.length,
        fastMoving: inventoryKpi.fastMoving.slice(0, 5),
      },

      repairs: {
        inProgress,
        waitingForParts,
        ready,
        deliveredToday,
      },

      alerts: {
        negativeStock: inventoryKpi.lowStock.slice(0, 5), // Show Low Stock items in alerts too
        deadStock: inventoryKpi.deadStock.slice(0, 5),
      },

      paymentStats,
      salesTrend,

      // 🎯 VALUE SNAPSHOT
      valueSnapshot: {
        monthRevenue: (monthSales._sum.totalAmount ?? 0) / 100,
        lastMonthRevenue: lastMonthSalesAmount, // Phase 3
        invoiceCount: monthSales._count.id,
        collectionRate,
        whatsappStats: {
          sent: whatsappSent,
          delivered: whatsappDelivered,
          recoveredAmount: whatsappRecoverySales, // Phase 2
        },
        repairTurnaroundDays,
      },
    };

    // 📦 CACHE RESPONSE for 60 seconds
    await this.cacheManager.set(cacheKey, response, 60000); // 60 seconds TTL

    return response;
  }

  /**
   * Get per-shop revenue breakdown for the current month
   */
  async getShopBreakdown(tenantId: string) {
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const shops = await this.prisma.shop.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, name: true },
    });

    if (shops.length === 0) return [];

    const shopIds = shops.map((s) => s.id);

    // 🚀 BATCHED QUERIES - Fetch all shop data in two queries
    const [salesAggs, jobCardAggs] = await Promise.all([
      this.prisma.invoice.groupBy({
        by: ['shopId'],
        where: {
          tenantId,
          shopId: { in: shopIds },
          createdAt: { gte: monthStart },
          deletedAt: null,
        },
        _sum: { totalAmount: true },
        _count: { id: true },
      }),
      this.prisma.jobCard.groupBy({
        by: ['shopId'],
        where: {
          tenantId,
          shopId: { in: shopIds },
          createdAt: { gte: monthStart },
          deletedAt: null,
        },
        _count: { id: true },
      }),
    ]);

    // Construct maps for O(1) lookup
    const salesMap = new Map(salesAggs.map((s) => [s.shopId, s]));
    const jobCardMap = new Map(jobCardAggs.map((j) => [j.shopId, j._count.id]));

    const breakdown = shops.map((shop) => {
      const sales = salesMap.get(shop.id);
      return {
        shopId: shop.id,
        shopName: shop.name,
        revenue: (sales?._sum.totalAmount ?? 0) / 100,
        salesCount: sales?._count.id ?? 0,
        jobCardCount: jobCardMap.get(shop.id) ?? 0,
      };
    });

    return breakdown.sort((a, b) => b.revenue - a.revenue);
  }
}
