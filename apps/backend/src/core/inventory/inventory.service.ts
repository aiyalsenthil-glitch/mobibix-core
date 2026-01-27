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
    if (dto.serialNumber) {
      const exists = await this.prisma.shopProduct.findUnique({
        where: { serialNumber: dto.serialNumber },
      });
      if (exists) throw new ConflictException('Serial number already exists');
    }

    const normalizedType: PrismaProductType = (() => {
      const t = dto.type?.toString().toUpperCase();
      if (t === 'ACCESSORY') return PrismaProductType.GOODS;
      if (t === 'GOODS' || t === 'SPARE' || t === 'SERVICE') {
        return t as PrismaProductType;
      }
      return PrismaProductType.GOODS;
    })();

    return this.prisma.shopProduct.create({
      data: {
        tenantId,
        shopId: dto.shopId,
        name: dto.name,
        type: normalizedType,
        category: dto.category,
        serialNumber: dto.serialNumber,
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

    return this.prisma.shopProduct.update({
      where: {
        id,
        tenantId,
      },
      data: {
        name: dto.name,
        type: normalizedType,
        category: dto.category,
        serialNumber: dto.serialNumber,
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
