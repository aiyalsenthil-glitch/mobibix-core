import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { PurchaseStockInDto } from './dto/purchase-stock-in.dto';

@Injectable()
export class StockService {
  constructor(private prisma: PrismaService) {}

  async purchaseStockIn(tenantId: string, dto: PurchaseStockInDto) {
    if (!dto.items?.length) {
      throw new BadRequestException('At least one item required');
    }

    return this.prisma.$transaction(async (tx) => {
      // validate shop belongs to tenant
      const shop = await tx.shop.findFirst({
        where: { id: dto.shopId, tenantId },
        select: { id: true },
      });

      if (!shop) {
        throw new BadRequestException('Invalid shop');
      }

      // validate products
      const productIds = dto.items.map((i) => i.shopProductId);
      const products = await tx.shopProduct.findMany({
        where: {
          id: { in: productIds },
          tenantId,
          shopId: dto.shopId,
          isActive: true,
        },
        select: { id: true },
      });

      if (products.length !== productIds.length) {
        throw new BadRequestException('Invalid product in items');
      }

      // create stock ledger entries
      const entries = dto.items.map((i) => ({
        tenantId,
        shopId: dto.shopId,
        shopProductId: i.shopProductId,
        type: 'IN' as const,
        quantity: i.quantity,
        referenceType: 'PURCHASE' as const,
        referenceId: dto.purchaseRef ?? null,
        note: dto.note ?? null,
      }));

      await tx.stockLedger.createMany({ data: entries });

      // OPTIONAL: update last cost price (safe)
      for (const i of dto.items) {
        if (i.costPrice !== undefined) {
          await tx.shopProduct.update({
            where: { id: i.shopProductId },
            data: { costPrice: i.costPrice },
          });
        }
      }

      return { success: true, entries: entries.length };
    });
  }
}
