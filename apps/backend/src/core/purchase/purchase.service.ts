import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { ProductType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PurchaseStockInDto } from './dto/purchase-stock-in.dto';
import { assertShopAccess } from '../../common/guards/shop-access.guard';
import { StockService } from '../stock/stock.service';

@Injectable()
export class PurchaseService {
  constructor(
    private prisma: PrismaService,
    private stockService: StockService,
  ) {}

  async stockIn(tenantId: string, dto: PurchaseStockInDto) {
    if (!dto.items?.length) {
      throw new BadRequestException('At least one item required');
    }

    return this.prisma.$transaction(async (tx) => {
      // Validate shop access
      await assertShopAccess(tx, dto.shopId, tenantId);

      const stockItems = dto.items.map((item) => ({
        productId: item.shopProductId,
        quantity: item.quantity || (item.imeis?.length ?? 0),
        costPerUnit: item.costPrice !== undefined ? Math.round(item.costPrice * 100) : undefined,
        imeis: item.imeis,
        note: dto.note ?? undefined,
      }));

      // Delegate all stock/WAC/ledger logic to StockService
      await this.stockService.recordStockInBatch(
        tenantId,
        dto.shopId,
        stockItems,
        'PURCHASE',
        dto.purchaseRef || null,
        tx,
      );

      return { success: true, items: stockItems.length };
    });
  }
}
