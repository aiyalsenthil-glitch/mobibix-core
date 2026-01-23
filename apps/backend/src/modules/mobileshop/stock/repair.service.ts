import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { RepairStockOutDto } from './dto/repair-stock-out.dto';

@Injectable()
export class RepairService {
  constructor(private prisma: PrismaService) {}

  async stockOutForRepair(tenantId: string, dto: RepairStockOutDto) {
    if (!dto.items?.length) {
      throw new BadRequestException('At least one item required');
    }

    return this.prisma.$transaction(async (tx) => {
      // validate shop
      const shop = await tx.shop.findFirst({
        where: { id: dto.shopId, tenantId },
        select: { id: true },
      });
      if (!shop) throw new BadRequestException('Invalid shop');

      // validate job card
      const job = await tx.jobCard.findFirst({
        where: {
          id: dto.jobCardId,
          tenantId,
          shopId: dto.shopId,
        },
        select: { id: true, status: true },
      });
      if (!job) throw new BadRequestException('Invalid job card');

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

      // STOCK OUT entries (negative allowed)
      const entries = dto.items.map((i) => ({
        tenantId,
        shopId: dto.shopId,
        shopProductId: i.shopProductId,
        type: 'OUT' as const,
        quantity: i.quantity,
        referenceType: 'REPAIR' as const,
        referenceId: dto.jobCardId,
        note: dto.note ?? null,
      }));

      await tx.stockLedger.createMany({ data: entries });

      return { success: true, entries: entries.length };
    });
  }
}
