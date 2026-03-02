import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { ProductType } from '@prisma/client';

@Injectable()
export class StockValidationService {
  private readonly logger = new Logger(StockValidationService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Validate sufficient stock before OUT operation (repair parts or sales)
   * Handles both serialized (IMEI) and bulk inventory
   */
   async validateStockOut(
    tenantId: string,
    productId: string,
    quantity: number,
  ): Promise<void> {
    if (!tenantId || !productId || quantity <= 0) {
      throw new BadRequestException('Invalid parameters');
    }

    const product = await this.prisma.shopProduct.findUnique({
      where: { id: productId },
      select: { id: true, name: true, type: true, isSerialized: true, quantity: true } as any,
    });

    if (!product) throw new NotFoundException(`Product not found`);
    if ((product as any).type === ProductType.SERVICE) throw new BadRequestException(`SERVICE products don't have stock`);

    if (product.isSerialized) {
      const available = await this.prisma.iMEI.count({
        where: { tenantId, shopProductId: productId, status: 'IN_STOCK' },
      });
      if (available < quantity) {
        throw new BadRequestException(`Insufficient serialized stock. Available: ${available}`);
      }
    } else { // This block handles non-serialized products
      if ((product as any).type === ProductType.GOODS) { // Explicitly check for GOODS type for bulk stock
        if ((product as any).quantity < quantity) {
          throw new BadRequestException(`Insufficient stock for ${product.name}. Available: ${(product as any).quantity}, Required: ${quantity}`);
        }
      }
    }
  }

  /**
   * Calculate current stock balance from StockLedger
   * Sums all IN entries and subtracts all OUT entries
   */
   async getStockBalance(tenantId: string, productId: string): Promise<number> {
    const product = await this.prisma.shopProduct.findUnique({
      where: { id: productId },
      select: { quantity: true },
    });
    if (!product) return 0;
    return (product as any).quantity || 0;
  }

  /**
   * Get breakdown of IMEI status for a product
   * Returns count of each status (IN_STOCK, SOLD, DAMAGED, RETURNED, etc)
   */
  async getIMEIBreakdown(
    tenantId: string,
    productId: string,
  ): Promise<Record<string, number>> {
    const statuses = await this.prisma.iMEI.groupBy({
      by: ['status'],
      where: {
        tenantId,
        shopProductId: productId,
      },
      _count: true,
    });

    const breakdown = Object.fromEntries(
      statuses.map((s) => [s.status, s._count]),
    );

    this.logger.debug(
      `IMEI breakdown for product=${productId}: ${JSON.stringify(breakdown)}`,
    );

    return breakdown;
  }

  /**
   * Get available IMEI list for a product
   * Used when allocating specific units to a sale/repair
   */
  async getAvailableIMEIs(
    tenantId: string,
    productId: string,
    limit: number = 100,
  ): Promise<Array<{ imei: string; status: string }>> {
    return this.prisma.iMEI.findMany({
      where: {
        tenantId,
        shopProductId: productId,
        status: 'IN_STOCK',
      },
      select: { imei: true, status: true },
      take: limit,
    });
  }

  /**
   * Validate multiple products for batch operations (e.g., bulk sale)
   * Returns validation result for each product or throws on first error
   */
  async validateMultiple(
    tenantId: string,
    items: Array<{ productId: string; quantity: number }>,
  ): Promise<void> {
    for (const item of items) {
      await this.validateStockOut(tenantId, item.productId, item.quantity);
    }
  }

  /**
   * Check if product is oversold (negative stock in ledger)
   * Used for audit/correction workflows
   */
   async isOversold(tenantId: string, productId: string): Promise<boolean> {
    const balance = await this.getStockBalance(tenantId, productId);
    return balance < 0;
  }

  /**
   * Get low stock warning threshold
   * Returns products below reorder level (useful for dashboard alerts)
   */
   async getLowStockProducts(
    tenantId: string,
    shopId?: string,
  ): Promise<
    Array<{ id: string; name: string; balance: number; reorderLevel: number }>
  > {
    const lowStock = await this.prisma.shopProduct.findMany({
      where: {
        tenantId,
        ...(shopId && { shopId }),
        isActive: true,
        type: { not: ProductType.SERVICE },
        // quantity: { lte: ... } // Handled by fallback below for accurate reorder level comparison
      },
      select: { id: true, name: true, quantity: true, reorderLevel: true } as any,
    });

    // Fallback to manual filter because Prisma lte field reference is tricky
    const allProducts = await this.prisma.shopProduct.findMany({
      where: { tenantId, ...(shopId && { shopId }), isActive: true, type: { not: 'SERVICE' } },
      select: { id: true, name: true, quantity: true, reorderLevel: true },
    });

    return allProducts
      .filter(p => (p as any).quantity <= (p.reorderLevel ?? 5))
      .map(p => ({ id: p.id, name: p.name, balance: (p as any).quantity, reorderLevel: p.reorderLevel ?? 5 }));
  }
}
