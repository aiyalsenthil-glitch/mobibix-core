import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async listByShop(tenantId: string, shopId: string) {
    const products = await this.prisma.shopProduct.findMany({
      where: {
        tenantId,
        shopId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        salePrice: true,
        costPrice: true,
        isActive: true,
        global: {
          select: {
            hsn: {
              select: {
                code: true,
                taxRate: true,
              },
            },
          },
        },
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
        id: p.id,
        name: p.name,
        hsnCode: p.global?.hsn?.code,
        gstRate: p.global?.hsn?.taxRate,
        salePrice: p.salePrice,
        costPrice: p.costPrice,
        isActive: p.isActive,
        stockQty,
      };
    });
  }
}
