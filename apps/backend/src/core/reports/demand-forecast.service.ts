import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface DemandForecastItem {
  shopProductId: string;
  name: string;
  sku?: string;
  category?: string;
  currentStock: number;
  avgDailyDemand: number; // units/day
  daysOfStock: number; // estimated days until stockout
  totalSold90d: number;
  suggestedReorder: number; // units to reorder (30-day supply)
  urgency: 'CRITICAL' | 'LOW' | 'OK'; // <7 days / 7-30 days / 30+
}

@Injectable()
export class DemandForecastService {
  constructor(private prisma: PrismaService) {}

  /**
   * Calculate demand forecast for all products in a shop.
   * Uses 90-day rolling sales data from invoice items.
   * Paisa values are NOT involved here — only quantities and names.
   */
  async forecast(tenantId: string, shopId: string): Promise<DemandForecastItem[]> {
    const since = new Date();
    since.setDate(since.getDate() - 90);

    // Aggregate sales per product over last 90 days
    const salesData = await this.prisma.$queryRaw<
      { shopProductId: string; totalSold: bigint }[]
    >`
      SELECT
        ii."shopProductId",
        SUM(ii.quantity) AS "totalSold"
      FROM mb_invoice_item ii
      JOIN mb_invoice inv ON inv.id = ii."invoiceId"
      WHERE inv."tenantId" = ${tenantId}
        AND inv."shopId" = ${shopId}
        AND inv."deletedAt" IS NULL
        AND inv."invoiceDate" >= ${since}
      GROUP BY ii."shopProductId"
    `;

    if (!salesData.length) return [];

    const productIds = salesData.map((r) => r.shopProductId);

    const products = await this.prisma.shopProduct.findMany({
      where: {
        id: { in: productIds },
        tenantId,
        shopId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        sku: true,
        category: true,
        quantity: true,
      },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    const results: DemandForecastItem[] = [];

    for (const row of salesData) {
      const product = productMap.get(row.shopProductId);
      if (!product) continue;

      const totalSold90d = Number(row.totalSold);
      const avgDailyDemand = totalSold90d / 90;
      const currentStock = product.quantity;
      const daysOfStock =
        avgDailyDemand > 0 ? currentStock / avgDailyDemand : Infinity;
      const suggestedReorder = Math.ceil(avgDailyDemand * 30); // 30-day supply

      let urgency: DemandForecastItem['urgency'] = 'OK';
      if (daysOfStock < 7) urgency = 'CRITICAL';
      else if (daysOfStock < 30) urgency = 'LOW';

      results.push({
        shopProductId: row.shopProductId,
        name: product.name,
        sku: product.sku ?? undefined,
        category: product.category ?? undefined,
        currentStock,
        avgDailyDemand: Math.round(avgDailyDemand * 100) / 100,
        daysOfStock: daysOfStock === Infinity ? 9999 : Math.round(daysOfStock),
        totalSold90d,
        suggestedReorder,
        urgency,
      });
    }

    // Sort: CRITICAL first, then LOW, then OK; within each group by daysOfStock ASC
    results.sort((a, b) => {
      const urgencyOrder = { CRITICAL: 0, LOW: 1, OK: 2 };
      const diff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      if (diff !== 0) return diff;
      return a.daysOfStock - b.daysOfStock;
    });

    return results;
  }
}
