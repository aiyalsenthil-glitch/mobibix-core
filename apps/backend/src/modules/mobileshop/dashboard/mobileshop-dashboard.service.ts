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

  async getOwnerDashboard(tenantId: string, shopId?: string, skipCache = false) {
    // 🔴 CHECK CACHE FIRST
    const cacheKey = `dashboard:owner:${tenantId}:${shopId || 'all'}`;
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
    ] = await Promise.all([
      // Today's sales
      this.prisma.invoice.aggregate({
        where: {
          tenantId,
          shopId: { in: shopIds },
          createdAt: { gte: today },
        },
        _sum: { totalAmount: true },
      }),
      // Today's job cards
      this.prisma.jobCard.count({
        where: {
          tenantId,
          shopId: { in: shopIds },
          createdAt: { gte: today },
        },
      }),
      // Month sales
      this.prisma.invoice.aggregate({
        where: {
          tenantId,
          shopId: { in: shopIds },
          createdAt: { gte: monthStart },
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
        },
        _count: true,
      }),
    ]);

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

    const paymentStats = paymentStatsRaw.map(stat => ({
      name: stat.paymentMode,
      value: (stat._sum.totalAmount ?? 0) / 100
    }));

    // 🔹 NEW: SALES TREND (Last 7 days)
    const trendStart = new Date();
    trendStart.setDate(trendStart.getDate() - 7);
    trendStart.setHours(0, 0, 0, 0);

    const salesTrendRaw = await this.prisma.invoice.groupBy({
      by: ['createdAt'],
      where: {
        tenantId,
        shopId: { in: shopIds },
        createdAt: { gte: trendStart },
      },
      _sum: { totalAmount: true },
    });

    // Group by Date (YYYY-MM-DD) manually since Prisma groupBy by date part isn't direct
    // Actually, fetching raw data might be better for trend if volume is low, or using raw query.
    // For now, let's stick to a simpler approach: 
    // Since we need daily sums, we can use a raw query or just fetch essential fields and aggregate in memory 
    // (efficient enough for 7 days).
    
    // Better: Use `findMany` and aggregate in memory for last 7 days (usually < 1000 invoices)
    const trendInvoices = await this.prisma.invoice.findMany({
      where: {
        tenantId,
        shopId: { in: shopIds },
        createdAt: { gte: trendStart },
      },
      select: { createdAt: true, totalAmount: true },
    });

    const trendMap = new Map<string, number>();
    trendInvoices.forEach(inv => {
      const date = inv.createdAt.toISOString().split('T')[0];
      const amount = (inv.totalAmount ?? 0) / 100;
      trendMap.set(date, (trendMap.get(date) ?? 0) + amount);
    });

    // Format for chart (last 7 days filled)
    const salesTrend: { date: string; sales: number }[] = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateKey = d.toISOString().split('T')[0];
        const displayDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        salesTrend.push({
            date: displayDate,
            sales: trendMap.get(dateKey) ?? 0
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
        negativeStockCount: inventoryKpi.negativeStock.length,
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
        negativeStock: inventoryKpi.negativeStock.slice(0, 5),
        deadStock: inventoryKpi.deadStock.slice(0, 5),
      },

      // aggregated stats
      paymentStats,
      salesTrend,
    };


    // 📦 CACHE RESPONSE for 60 seconds
    await this.cacheManager.set(cacheKey, response, 60000); // 60 seconds TTL

    return response;
  }
}
