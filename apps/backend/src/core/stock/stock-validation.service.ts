import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

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
      throw new BadRequestException('Invalid tenantId, productId, or quantity');
    }

    const product = await this.prisma.shopProduct.findUnique({
      where: { id: productId },
    });

    if (!product) {
      this.logger.warn(
        `Product not found: tenantId=${tenantId}, productId=${productId}`,
      );
      throw new NotFoundException(`Product not found`);
    }

    // SERVICE products don't have stock
    if (product.type === 'SERVICE') {
      throw new BadRequestException(
        `Cannot deduct stock from SERVICE products (${product.name})`,
      );
    }

    if (product.isSerialized) {
      // Check IMEI count (serialized inventory)
      const available = await this.prisma.iMEI.count({
        where: {
          tenantId,
          shopProductId: productId,
          status: 'IN_STOCK',
        },
      });

      if (available < quantity) {
        this.logger.warn(
          `Insufficient serialized stock: product=${productId}, available=${available}, requested=${quantity}`,
        );
        throw new BadRequestException(
          `Insufficient serialized units of ${product.name}. Available: ${available}, Requested: ${quantity}`,
        );
      }
    } else {
      // Check StockLedger balance (bulk inventory)
      const balance = await this.getStockBalance(tenantId, productId);

      if (balance < quantity) {
        this.logger.warn(
          `Insufficient bulk stock: product=${productId}, balance=${balance}, requested=${quantity}`,
        );
        throw new BadRequestException(
          `Insufficient bulk stock of ${product.name}. Available: ${balance}, Requested: ${quantity}`,
        );
      }
    }

    this.logger.debug(
      `Stock validation passed: product=${productId}, quantity=${quantity}`,
    );
  }

  /**
   * Calculate current stock balance from StockLedger
   * Sums all IN entries and subtracts all OUT entries
   */
  async getStockBalance(tenantId: string, productId: string): Promise<number> {
    const entries = await this.prisma.stockLedger.findMany({
      where: {
        tenantId,
        shopProductId: productId,
      },
      select: { type: true, quantity: true },
    });

    const balance = entries.reduce((total, entry) => {
      return entry.type === 'IN'
        ? total + entry.quantity
        : total - entry.quantity;
    }, 0);

    this.logger.debug(
      `Stock balance: product=${productId}, balance=${balance}`,
    );

    return Math.max(0, balance); // Never negative
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
    const products = await this.prisma.shopProduct.findMany({
      where: {
        tenantId,
        ...(shopId && { shopId }),
      },
      select: {
        id: true,
        name: true,
        type: true,
        isSerialized: true,
        reorderLevel: true,
      },
    });

    const lowStock: Array<{
      id: string;
      name: string;
      balance: number;
      reorderLevel: number;
    }> = [];

    for (const product of products) {
      if (product.type === 'SERVICE') continue;

      const balance = product.isSerialized
        ? await this.prisma.iMEI.count({
            where: {
              tenantId,
              shopProductId: product.id,
              status: 'IN_STOCK',
            },
          })
        : await this.getStockBalance(tenantId, product.id);

      const reorderThreshold = product.reorderLevel ?? 5;

      if (balance <= reorderThreshold) {
        lowStock.push({
          id: product.id,
          name: product.name,
          balance,
          reorderLevel: reorderThreshold,
        });
      }
    }

    return lowStock;
  }
}
