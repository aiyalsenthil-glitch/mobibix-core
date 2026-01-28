import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { StockService } from './stock.service';
import { StockCorrectionDto } from './dto/stock-correction.dto';
import { ProductType } from '@prisma/client';

@Injectable()
export class StockCorrectionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stockService: StockService,
  ) {}

  /**
   * Manually correct stock levels for non-serialized, non-SERVICE products.
   * Creates audit trail via StockCorrection table and updates StockLedger.
   *
   * ATOMIC: audit row + ledger row succeed or fail together
   */
  async correctStock(
    tenantId: string,
    userId: string | undefined,
    dto: StockCorrectionDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // 1️⃣ Validate product
      const product = await tx.shopProduct.findFirst({
        where: {
          id: dto.shopProductId,
          tenantId,
          shopId: dto.shopId,
          isActive: true,
        },
        select: { id: true, name: true, type: true, isSerialized: true },
      });

      if (!product) {
        throw new BadRequestException('Product not found');
      }

      if (product.type === ProductType.SERVICE) {
        throw new BadRequestException('SERVICE products cannot be corrected');
      }

      if (product.isSerialized) {
        throw new BadRequestException('Use IMEI-based stock correction');
      }

      // 2️⃣ Create correction audit record
      const correction = await tx.stockCorrection.create({
        data: {
          tenantId,
          shopId: dto.shopId,
          shopProductId: dto.shopProductId,
          quantity: dto.quantity,
          reason: dto.reason,
          note: dto.note,
          createdBy: userId ?? null,
        },
      });

      const absQty = Math.abs(dto.quantity);

      // 3️⃣ Apply stock movement via StockService
      if (dto.quantity > 0) {
        await this.stockService.recordStockIn(
          tenantId,
          dto.shopId,
          dto.shopProductId,
          absQty,
          'ADJUSTMENT',
          correction.id,
        );
      } else {
        await this.stockService.recordStockOut(
          tenantId,
          dto.shopId,
          dto.shopProductId,
          absQty,
          'ADJUSTMENT',
          correction.id,
        );
      }

      return { id: correction.id, success: true };
    });
  }
}
