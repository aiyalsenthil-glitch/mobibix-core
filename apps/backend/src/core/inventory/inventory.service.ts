import { Injectable, ConflictException } from '@nestjs/common';
import { ProductType as PrismaProductType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StockService, type StockBalance } from '../stock/stock.service';
import { CreateProductDto } from './dto/create-product.dto';

@Injectable()
export class InventoryService {
  constructor(
    private prisma: PrismaService,
    private stockService: StockService,
  ) {}

  async createProduct(tenantId: string, dto: CreateProductDto) {
    const normalizedType: PrismaProductType = (() => {
      const t = dto.type?.toString().toUpperCase();
      if (t === 'ACCESSORY') return PrismaProductType.GOODS;
      if (t === 'GOODS' || t === 'SPARE' || t === 'SERVICE') {
        return t as PrismaProductType;
      }
      return PrismaProductType.GOODS;
    })();

    // Determine if product should be serialized
    // GOODS + isSerialized = true → IMEI mandatory per unit
    // GOODS + isSerialized = false → quantity-based tracking
    // SPARE → always quantity-based (isSerialized = false)
    // SERVICE → no stock tracking (isSerialized = false)
    const isSerialized =
      normalizedType === PrismaProductType.GOODS && dto.isSerialized === true;

    // Duplicate check
    const existing = await this.prisma.shopProduct.findFirst({
      where: {
        shopId: dto.shopId,
        name: { equals: dto.name, mode: 'insensitive' },
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(
        `Product with name "${dto.name}" already exists in this shop`,
      );
    }

    return this.prisma.shopProduct.create({
      data: {
        tenantId,
        shopId: dto.shopId,
        name: dto.name,
        type: normalizedType,
        category: dto.category,
        isSerialized,
        salePrice: dto.salePrice,
        costPrice: dto.costPrice,
        hsnCode: dto.hsnCode,
        gstRate: dto.gstRate,
        isActive: true,
      },
    });
  }

  async updateProduct(tenantId: string, id: string, dto: CreateProductDto) {
    const normalizedType: PrismaProductType = (() => {
      const t = dto.type?.toString().toUpperCase();
      if (t === 'ACCESSORY') return PrismaProductType.GOODS;
      if (t === 'GOODS' || t === 'SPARE' || t === 'SERVICE') {
        return t as PrismaProductType;
      }
      return PrismaProductType.GOODS;
    })();

    // Calculate isSerialized based on type
    const isSerialized =
      normalizedType === PrismaProductType.GOODS && dto.isSerialized === true;

    // Duplicate check if name changed
    const existingProduct = await this.prisma.shopProduct.findUnique({
      where: { id },
      select: { name: true, shopId: true },
    });

    if (existingProduct && dto.name !== existingProduct.name) {
      const duplicate = await this.prisma.shopProduct.findFirst({
        where: {
          shopId: existingProduct.shopId,
          name: { equals: dto.name, mode: 'insensitive' },
          id: { not: id },
        },
        select: { id: true },
      });

      if (duplicate) {
        throw new ConflictException(
          `Product with name "${dto.name}" already exists in this shop`,
        );
      }
    }

    return this.prisma.shopProduct.update({
      where: {
        id,
        tenantId,
      },
      data: {
        name: dto.name,
        type: normalizedType,
        category: dto.category,
        isSerialized,
        salePrice: dto.salePrice,
        costPrice: dto.costPrice,
        hsnCode: dto.hsnCode,
        gstRate: dto.gstRate,
      },
    });
  }

  async getLowStock(tenantId: string, threshold = 5): Promise<StockBalance[]> {
    const balances = await this.stockService.getStockBalances(tenantId);
    return balances.filter((p) => p.stockQty <= threshold);
  }
}
