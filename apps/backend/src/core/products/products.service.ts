import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  private fromPaisa(amount: number | null | undefined): number | null {
    if (amount === null || amount === undefined) return null;
    return amount / 100;
  }

  async listByShop(
    tenantId: string,
    shopId: string,
    options?: { skip?: number; take?: number },
  ) {
    // Parallel queries for better performance
    const [products, total] = await Promise.all([
      this.prisma.shopProduct.findMany({
        where: {
          tenantId,
          shopId,
          isActive: true,
        },
        skip: options?.skip ?? 0,
        take: options?.take ?? 50,
        select: {
          id: true,
          name: true,
          category: true,
          salePrice: true,
          costPrice: true,
          isActive: true,
          hsnCode: true,
          gstRate: true,
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
      }),
      this.prisma.shopProduct.count({
        where: { tenantId, shopId, isActive: true },
      }),
    ]);

    const mappedProducts = products.map((p) => {
      const stockQty = p.stockEntries.reduce((sum, e) => {
        return e.type === 'IN' ? sum + e.quantity : sum - e.quantity;
      }, 0);

      return {
        id: p.id,
        name: p.name,
        category: p.category,
        hsnCode: p.hsnCode || p.global?.hsn?.code,
        gstRate: p.gstRate || p.global?.hsn?.taxRate,
        salePrice: this.fromPaisa(p.salePrice),
        costPrice: this.fromPaisa(p.costPrice),
        isActive: p.isActive,
        stockQty,
      };
    });

    return {
      data: mappedProducts,
      total,
      skip: options?.skip ?? 0,
      take: options?.take ?? 50,
    };
  }
  async findOne(tenantId: string, shopId: string, productId: string) {
    const product = await this.prisma.shopProduct.findUnique({
      where: { id: productId },
      include: {
        global: {
          select: {
            hsn: { select: { code: true, taxRate: true } },
          },
        },
        stockEntries: {
          select: { type: true, quantity: true },
        },
      },
    });

    if (
      !product ||
      product.shopId !== shopId ||
      product.tenantId !== tenantId
    ) {
      return null;
    }

    const stockQty = product.stockEntries.reduce((sum, e) => {
      return e.type === 'IN' ? sum + e.quantity : sum - e.quantity;
    }, 0);

    return {
      id: product.id,
      name: product.name,
      category: product.category,
      hsnCode: product.hsnCode || product.global?.hsn?.code,
      gstRate: product.gstRate || product.global?.hsn?.taxRate,
      salePrice: this.fromPaisa(product.salePrice),
      costPrice: this.fromPaisa(product.costPrice),
      isActive: product.isActive,
      stockQty,
    };
  }
}
