import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/core/prisma/prisma.service';

@Injectable()
export class StockSummaryService {
  constructor(private prisma: PrismaService) {}

  async getSummary(tenantId: string, shopId: string) {
    // validate shop
    const shop = await this.prisma.shop.findFirst({
      where: { id: shopId, tenantId },
      select: { id: true },
    });
    if (!shop) throw new BadRequestException('Invalid shop');

    // fetch products with ledger
    const products = await this.prisma.shopProduct.findMany({
      where: {
        tenantId,
        shopId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        stockEntries: {
          select: {
            type: true,
            quantity: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return products.map((p) => {
      const stockQty = p.stockEntries.reduce((sum, e) => {
        return e.type === 'IN' ? sum + e.quantity : sum - e.quantity;
      }, 0);

      return {
        productId: p.id,
        name: p.name,
        stockQty,
        isNegative: stockQty < 0,
      };
    });
  }
}
