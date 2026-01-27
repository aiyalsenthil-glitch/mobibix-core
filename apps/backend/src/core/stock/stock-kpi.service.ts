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

    // 1) MOVEMENT TREND
    const ledger = await this.prisma.stockLedger.findMany({
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
      orderBy: { createdAt: 'asc' },
    });

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

    // 2) FAST / DEAD STOCK
    const products = await this.prisma.shopProduct.findMany({
      where: { tenantId, shopId, isActive: true },
      select: {
        id: true,
        name: true,
        stockEntries: {
          where: {
            createdAt: { gte: fromDate },
            type: 'OUT',
          },
          select: { quantity: true },
        },
      },
    });

    const movement = products.map((p) => {
      const outQty = p.stockEntries.reduce((s, e) => s + e.quantity, 0);
      return { productId: p.id, name: p.name, outQty };
    });

    const fastMoving = movement
      .filter((m) => m.outQty > 0)
      .sort((a, b) => b.outQty - a.outQty)
      .slice(0, 10);

    const deadStock = movement.filter((m) => m.outQty === 0);

    // 3) NEGATIVE STOCK KPI
    const fullLedger = await this.prisma.stockLedger.findMany({
      where: {
        tenantId,
        shopId,
        createdAt: { gte: addDays(new Date(), -90) }, // last 90 days only
      },
      select: {
        shopProductId: true,
        type: true,
        quantity: true,
        createdAt: true,
        product: { select: { name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const balanceMap = new Map<
      string,
      {
        balance: number;
        negativeCount: number;
        negativeDays: Set<string>;
        name: string;
      }
    >();

    for (const l of fullLedger) {
      const day = formatISO(l.createdAt, { representation: 'date' });
      const row = balanceMap.get(l.shopProductId) ?? {
        balance: 0,
        negativeCount: 0,
        negativeDays: new Set<string>(),
        name: l.product.name,
      };

      row.balance += l.type === 'IN' ? l.quantity : -l.quantity;

      if (row.balance < 0) {
        row.negativeCount += 1;
        row.negativeDays.add(day);
      }

      balanceMap.set(l.shopProductId, row);
    }

    const negativeStock = Array.from(balanceMap.entries())
      .filter(([, v]) => v.negativeCount > 0)
      .map(([productId, v]) => ({
        productId,
        name: v.name,
        negativeCount: v.negativeCount,
        negativeDays: v.negativeDays.size,
      }));

    return {
      trend,
      fastMoving,
      deadStock,
      negativeStock,
    };
  }
}
