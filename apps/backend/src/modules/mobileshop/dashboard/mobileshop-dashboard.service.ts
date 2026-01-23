import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { StockKpiService } from '../stock/stock-kpi.service';

@Injectable()
export class MobileShopDashboardService {
  constructor(
    private prisma: PrismaService,
    private stockKpiService: StockKpiService,
  ) {}

  async getOwnerDashboard(tenantId: string, shopId?: string) {
    // 1️⃣ Resolve shops
    const shops = await this.prisma.shop.findMany({
      where: {
        tenantId,
        ...(shopId ? { id: shopId } : {}),
      },
      select: { id: true },
    });
    const shopIds = shops.map((s) => s.id);

    // -------------------------
    // TODAY SNAPSHOT (existing)
    // -------------------------
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [salesToday, jobsReceivedToday] = await Promise.all([
      this.prisma.invoice.aggregate({
        where: {
          tenantId,
          shopId: { in: shopIds },
          createdAt: { gte: today },
        },
        _sum: { totalAmount: true },
      }),
      this.prisma.jobCard.count({
        where: {
          tenantId,
          shopId: { in: shopIds },
          createdAt: { gte: today },
        },
      }),
    ]);

    // -------------------------
    // MONTH SALES (existing)
    // -------------------------
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const monthSales = await this.prisma.invoice.aggregate({
      where: {
        tenantId,
        shopId: { in: shopIds },
        createdAt: { gte: monthStart },
      },
      _sum: { totalAmount: true },
      _count: { id: true },
    });

    // =========================
    // 🔹 NEW: INVENTORY KPIs
    // =========================
    const inventoryKpi = await this.stockKpiService.overview(
      tenantId,
      shopId ?? shopIds[0], // KPI service is shop-based
      'MONTH',
      30,
    );

    const totalProducts = await this.prisma.shopProduct.count({
      where: {
        tenantId,
        shopId: { in: shopIds },
        isActive: true,
      },
    });

    // =========================
    // 🔹 NEW: REPAIR PIPELINE
    // =========================
    const [inProgress, waitingForParts, ready, deliveredToday] =
      await Promise.all([
        this.prisma.jobCard.count({
          where: { tenantId, shopId: { in: shopIds }, status: 'IN_PROGRESS' },
        }),
        this.prisma.jobCard.count({
          where: {
            tenantId,
            shopId: { in: shopIds },
            status: 'WAITING_FOR_PARTS',
          },
        }),
        this.prisma.jobCard.count({
          where: { tenantId, shopId: { in: shopIds }, status: 'READY' },
        }),
        this.prisma.jobCard.count({
          where: {
            tenantId,
            shopId: { in: shopIds },
            status: 'DELIVERED',
            updatedAt: { gte: today },
          },
        }),
      ]);

    // =========================
    // 🔹 FINAL RESPONSE
    // =========================
    return {
      today: {
        salesAmount: salesToday._sum.totalAmount ?? 0,
        jobsReceived: jobsReceivedToday,
      },

      month: {
        salesAmount: monthSales._sum.totalAmount ?? 0,
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
    };
  }
}
