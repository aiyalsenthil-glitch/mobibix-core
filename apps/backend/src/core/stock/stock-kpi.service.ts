import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { addDays, formatISO } from 'date-fns';

@Injectable()
export class StockKpiService {
  constructor(private prisma: PrismaService) {}

  async overview(
    tenantId: string,
    shopId: string,
    period: 'DAY' | 'WEEK' | 'MONTH' = 'MONTH',
    days = 30,
  ) {
    // validate shop
    const shop = await this.prisma.shop.findFirst({
      where: { id: shopId, tenantId },
      select: { id: true },
    });
    if (!shop) throw new BadRequestException('Invalid shop');

    const fromDate = addDays(new Date(), -days);

    // 🚀 PARALLEL QUERIES - fetch all KPIs at once
    const [ledger, productMovement, negativeStockData] = await Promise.all([
      // 1) MOVEMENT TREND - only last 50 entries for recent trend
      this.prisma.stockLedger.findMany({
        where: {
          tenantId,
          shopId,
          createdAt: { gte: fromDate },
        },
        select: {
          type: true,
          quantity: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 500, // Limit to prevent large datasets
      }),

      // 2) FAST/DEAD STOCK - Use DB aggregation instead of loading all products
      this.prisma.stockLedger
        .groupBy({
          by: ['shopProductId'],
          where: {
            tenantId,
            shopId,
            createdAt: { gte: fromDate },
            type: 'OUT',
          },
          _sum: { quantity: true },
          orderBy: { _sum: { quantity: 'desc' } },
          take: 20, // Get top 20 before filtering
        })
        .then(async (groups) => {
          // Get product names for the aggregated results
          if (groups.length === 0) return [];
          const productIds = groups.map((g) => g.shopProductId);
          const products = await this.prisma.shopProduct.findMany({
            where: { id: { in: productIds } },
            select: { id: true, name: true },
          });
          const productMap = new Map(products.map((p) => [p.id, p.name]));
          return groups
            .filter((g) => (g._sum.quantity ?? 0) > 0)
            .map((g) => ({
              productId: g.shopProductId,
              name: productMap.get(g.shopProductId) || 'Unknown',
              outQty: g._sum.quantity ?? 0,
            }))
            .slice(0, 10);
        }),

      // 3) NEGATIVE STOCK - Direct balance calculation with minimal data
      this.prisma.stockLedger
        .groupBy({
          by: ['shopProductId'],
          where: {
            tenantId,
            shopId,
            createdAt: { gte: addDays(new Date(), -90) },
          },
          _sum: { quantity: true },
        })
        .then(async (groups) => {
          // Filter to items with negative effective balance
          const negativeIds = groups
            .filter((g) => {
              const totalQty = g._sum.quantity ?? 0;
              return totalQty < 0;
            })
            .map((g) => g.shopProductId);

          if (negativeIds.length === 0) return [];

          // Get details for negative stock items
          const products = await this.prisma.shopProduct.findMany({
            where: { id: { in: negativeIds } },
            select: { id: true, name: true },
          });

          return products.map((p) => {
            const group = groups.find((g) => g.shopProductId === p.id);
            return {
              productId: p.id,
              name: p.name,
              negativeCount: 1, // Simplified: just mark as negative
              negativeDays: 1, // Simplified: dashboard only shows if currently negative
            };
          });
        }),
    ]);

    // Process trend data (in-memory, but limited to 500 entries)
    const trendMap = new Map<string, { stockIn: number; stockOut: number }>();

    for (const l of ledger) {
      const key =
        period === 'DAY'
          ? formatISO(l.createdAt, { representation: 'date' })
          : period === 'WEEK'
            ? formatISO(l.createdAt, { representation: 'date' }).slice(0, 8)
            : formatISO(l.createdAt, { representation: 'date' }).slice(0, 7);

      const entry = trendMap.get(key) ?? { stockIn: 0, stockOut: 0 };
      if (l.type === 'IN') entry.stockIn += l.quantity;
      else entry.stockOut += l.quantity;
      trendMap.set(key, entry);
    }

    const trend = Array.from(trendMap.entries()).map(([date, v]) => ({
      date,
      stockIn: v.stockIn,
      stockOut: v.stockOut,
    }));

    // Get dead stock (products with no movement)
    const allProducts = await this.prisma.shopProduct.count({
      where: { tenantId, shopId, isActive: true },
    });
    const movedProductCount = productMovement.length;
    const deadStockCount = Math.max(0, allProducts - movedProductCount);

    return {
      trend,
      fastMoving: productMovement,
      deadStock: deadStockCount > 0 ? [{ count: deadStockCount }] : [],
      negativeStock: negativeStockData,
    };
  }
}
