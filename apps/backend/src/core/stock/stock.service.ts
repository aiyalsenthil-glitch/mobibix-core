import { Injectable, BadRequestException } from '@nestjs/common';
import { ProductType } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { StockInDto } from '../inventory/dto/stock-in.dto';

export type StockBalance = {
  productId: string;
  name: string;
  stockQty: number;
  isNegative: boolean;
};

@Injectable()
export class StockService {
  constructor(private prisma: PrismaService) {}

  async stockInSingleProduct(tenantId: string, dto: StockInDto) {
    const product = await this.prisma.shopProduct.findFirst({
      where: { id: dto.productId, tenantId, isActive: true },
      select: { id: true, shopId: true, type: true },
    });

    if (!product) {
      throw new BadRequestException('Invalid product');
    }

    if (dto.type && dto.type !== product.type) {
      throw new BadRequestException('Product type mismatch');
    }

    const quantity =
      product.type === ProductType.GOODS && dto.imeis?.length
        ? dto.imeis.length
        : (dto.quantity ?? 0);

    if (!quantity) {
      throw new BadRequestException('Quantity required');
    }

    // Create stock ledger entry for simple stock-in
    return this.prisma.$transaction(async (tx) => {
      const ledgerEntry = {
        tenantId,
        shopId: product.shopId,
        shopProductId: product.id,
        type: 'IN' as const,
        quantity,
        referenceType: 'PURCHASE' as const,
        referenceId: null,
      };

      await tx.stockLedger.create({ data: ledgerEntry });

      // Handle IMEIs if goods product with IMEIs
      if (product.type === ProductType.GOODS && dto.imeis?.length) {
        await tx.iMEI.createMany({
          data: dto.imeis.map((imei) => ({
            tenantId,
            shopProductId: product.id,
            imei,
          })),
          skipDuplicates: true,
        });
      }

      return { success: true };
    });
  }

  async getStockBalances(
    tenantId: string,
    shopId?: string,
  ): Promise<StockBalance[]> {
    if (shopId) {
      const shop = await this.prisma.shop.findFirst({
        where: { id: shopId, tenantId },
        select: { id: true },
      });
      if (!shop) throw new BadRequestException('Invalid shop');
    }

    const products = await this.prisma.shopProduct.findMany({
      where: {
        tenantId,
        isActive: true,
        ...(shopId ? { shopId } : {}),
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
