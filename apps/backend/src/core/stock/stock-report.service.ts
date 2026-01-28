import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { NegativeStockReportDto } from './dto/negative-stock-report.dto';
import { ProductType } from '@prisma/client';

@Injectable()
export class StockReportService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns list of non-serialized, non-SERVICE products
   * whose cumulative stock is currently negative.
   */
  async getNegativeStockReport(
    tenantId: string,
  ): Promise<NegativeStockReportDto[]> {
    // Fetch all ledger entries in chronological order
    const entries = await this.prisma.stockLedger.findMany({
      where: {
        tenantId,
        product: {
          isSerialized: false,
          type: { not: ProductType.SERVICE },
        },
      },
      select: {
        shopProductId: true,
        shopId: true,
        type: true,
        quantity: true,
        createdAt: true,
        product: {
          select: {
            name: true,
            isSerialized: true,
            type: true,
          },
        },
        shop: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const summaries = new Map<
      string,
      {
        shopProductId: string;
        shopId: string;
        shopName: string;
        productName: string;
        currentStock: number;
        firstNegativeDate: Date | null;
        lastMovementDate: Date | null;
      }
    >();

    for (const entry of entries) {
      if (
        entry.product.isSerialized ||
        entry.product.type === ProductType.SERVICE
      ) {
        continue;
      }

      const key = `${entry.shopId}:${entry.shopProductId}`;

      const existing = summaries.get(key) ?? {
        shopProductId: entry.shopProductId,
        shopId: entry.shopId,
        shopName: entry.shop.name,
        productName: entry.product.name,
        currentStock: 0,
        firstNegativeDate: null,
        lastMovementDate: null,
      };

      const delta = entry.type === 'IN' ? entry.quantity : -entry.quantity;
      existing.currentStock += delta;
      existing.lastMovementDate = entry.createdAt;

      if (existing.currentStock < 0 && !existing.firstNegativeDate) {
        existing.firstNegativeDate = entry.createdAt;
      }

      summaries.set(key, existing);
    }

    // Return only products that are currently negative
    return Array.from(summaries.values()).filter(
      (item) => item.currentStock < 0,
    );
  }
}
