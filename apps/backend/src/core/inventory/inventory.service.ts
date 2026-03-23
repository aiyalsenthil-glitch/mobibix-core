import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
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

  private toPaisa(
    amount: number | undefined | null,
  ): number | undefined | null {
    if (amount === undefined || amount === null) return amount;
    return Math.round(amount * 100);
  }

  private fromPaisa(
    amount: bigint | number | undefined | null,
  ): number | undefined | null {
    if (amount === undefined || amount === null) return amount;
    return Number(amount) / 100;
  }

  private mapProduct(product: any) {
    if (!product) return null;
    return {
      ...product,
      salePrice: this.fromPaisa(product.salePrice),
      costPrice: this.fromPaisa(product.costPrice),
      avgCost: this.fromPaisa(product.avgCost),
      totalValue: product.totalValue !== undefined ? Number(product.totalValue) : undefined,
    };
  }

  async createProduct(tenantId: string, dto: CreateProductDto) {
    // Name is required for creation
    if (!dto.name || !dto.shopId) {
      throw new BadRequestException(
        'Name and shopId are required for creating a product',
      );
    }

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

    try {
      const product = await this.prisma.shopProduct.create({
        data: {
          tenantId,
          shopId: dto.shopId,
          name: dto.name,
          type: normalizedType,
          category: dto.category,
          brand: dto.brand,
          isSerialized,
          salePrice: this.toPaisa(dto.salePrice),
          costPrice: this.toPaisa(dto.costPrice),
          hsnCode: dto.hsnCode,
          gstRate: dto.gstRate,
          isActive: true,
        },
      });
      return this.mapProduct(product);
    } catch (error) {
      console.error('Error creating product:', error);
      throw new BadRequestException(
        `Failed to create product: ${error.message}`,
      );
    }
  }

  async updateProduct(tenantId: string, id: string, dto: CreateProductDto) {
    // Fetch existing product to merge updates
    const existing = await this.prisma.shopProduct.findFirst({
      where: { id, tenantId },
      select: {
        name: true,
        type: true,
        shopId: true,
        isSerialized: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Product not found');
    }

    const normalizedType: PrismaProductType | undefined = dto.type
      ? (() => {
          const t = dto.type?.toString().toUpperCase();
          if (t === 'ACCESSORY') return PrismaProductType.GOODS;
          if (t === 'GOODS' || t === 'SPARE' || t === 'SERVICE') {
            return t as PrismaProductType;
          }
          return PrismaProductType.GOODS;
        })()
      : undefined;

    // Calculate isSerialized based on type if type is being changed
    const isSerialized =
      normalizedType === PrismaProductType.GOODS && dto.isSerialized === true;

    // Duplicate check if name is being changed
    if (dto.name && dto.name !== existing.name) {
      const duplicate = await this.prisma.shopProduct.findFirst({
        where: {
          shopId: existing.shopId,
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

    // Build update data with only provided fields
    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.type !== undefined) updateData.type = normalizedType;
    if (dto.category !== undefined) updateData.category = dto.category;
    if (dto.brand !== undefined) updateData.brand = dto.brand;
    if (dto.isSerialized !== undefined) updateData.isSerialized = isSerialized;
    if (dto.salePrice !== undefined)
      updateData.salePrice = this.toPaisa(dto.salePrice);
    if (dto.costPrice !== undefined)
      updateData.costPrice = this.toPaisa(dto.costPrice);
    if (dto.hsnCode !== undefined) updateData.hsnCode = dto.hsnCode;
    if (dto.gstRate !== undefined) updateData.gstRate = dto.gstRate;

    const updated = await this.prisma.shopProduct.update({
      where: {
        id,
        tenantId,
      },
      data: updateData,
    });
    return this.mapProduct(updated);
  }

  async getLowStock(tenantId: string, threshold = 5): Promise<StockBalance[]> {
    const balances = await this.stockService.getStockBalances(tenantId);
    return balances.filter((p) => p.stockQty <= threshold);
  }

  async getStockLevels(tenantId: string, shopId: string): Promise<any[]> {
    const balances = await this.stockService.getStockBalances(tenantId, shopId);
    return balances.map((b) => ({
      id: b.productId, // Frontend expects .id
      name: b.name,
      stockQty: b.stockQty,
      isNegative: b.isNegative,
    }));
  }
}
