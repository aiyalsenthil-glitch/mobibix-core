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

      // 3) LOW STOCK & NEGATIVE STOCK - Correct Calculation
      (async () => {
        const stockStatus = await this.prisma.$queryRaw<
          Array<{
            shopProductId: string;
            balance: number;
          }>
        >`
          SELECT "shopProductId", SUM(CASE WHEN "type" = 'IN' THEN "quantity" ELSE -"quantity" END) as "balance"
          FROM "mb_stock_ledger"
          WHERE "tenantId" = ${tenantId} AND "shopId" = ${shopId}
          GROUP BY "shopProductId"
        `;

        // Get reorder levels for active products
        const products = await this.prisma.shopProduct.findMany({
          where: { tenantId, shopId, isActive: true },
          select: { id: true, name: true, reorderLevel: true },
        });

        // Map balance to products and find low stock / negative stock
        const lowStockItems: any[] = [];
        const negativeStockItems: any[] = [];

        products.forEach((p) => {
          const stockEntry = stockStatus.find((s) => s.shopProductId === p.id);
          const currentStock = stockEntry ? Number(stockEntry.balance) : 0; // Default to 0 if no ledger entries

          // Check for Negative Stock
          if (currentStock < 0) {
            negativeStockItems.push({
              productId: p.id,
              name: p.name,
              negativeCount: Math.abs(currentStock),
              negativeDays: 1,
            });
          }

          // Check for Low Stock (Stock <= Reorder Level)
          // Default reorderLevel is 0 if not set. So if stock is 0 and reorder is 0, it's low stock.
          const reorderLevel = p.reorderLevel ?? 0;
          if (currentStock <= reorderLevel) {
            lowStockItems.push({
              productId: p.id,
              name: p.name,
              stock: currentStock,
              reorderLevel: reorderLevel,
            });
          }
        });

        return {
          negativeStock: negativeStockItems,
          lowStock: lowStockItems,
        };
      })(),
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
      negativeStock: negativeStockData.negativeStock,
      lowStock: negativeStockData.lowStock,
    };
  }
}
