import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProductType, IMEIStatus } from '@prisma/client';
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
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  // Calculate current stock from StockLedger (single source of truth)
  async getCurrentStock(productId: string, tenantId: string): Promise<number> {
    const product = await this.prisma.shopProduct.findFirst({
      where: { id: productId, tenantId },
      select: { isSerialized: true, type: true },
    });

    if (!product) return 0;

    // For serialized products, count IN_STOCK IMEIs
    if (product.isSerialized) {
      return await this.prisma.iMEI.count({
        where: {
          shopProductId: productId,
          tenantId,
          status: IMEIStatus.IN_STOCK,
        },
      });
    }

    // For bulk products, sum StockLedger entries
    const entries = await this.prisma.stockLedger.findMany({
      where: { shopProductId: productId, tenantId },
      select: { type: true, quantity: true },
    });

    return entries.reduce((sum, e) => {
      return e.type === 'IN' ? sum + e.quantity : sum - e.quantity;
    }, 0);
  }

  // Validate and record stock OUT (with validation)
  async recordStockOut(
    tenantId: string,
    shopId: string,
    productId: string,
    quantity: number,
    referenceType: 'PURCHASE' | 'SALE' | 'REPAIR' | 'ADJUSTMENT',
    referenceId: string | null,
    costPerUnit?: number,
    imeis?: string[],
    tx?: any,
  ) {
    const prisma = tx || this.prisma;
    const product = await prisma.shopProduct.findFirst({
      where: { id: productId, tenantId, isActive: true },
      select: { id: true, type: true, isSerialized: true, name: true },
    });

    if (!product) {
      throw new BadRequestException('Product not found');
    }

    // SERVICE products cannot have stock operations
    if (product.type === ProductType.SERVICE) {
      throw new BadRequestException(
        `SERVICE product "${product.name}" cannot have stock operations`,
      );
    }

    // For serialized products, validate IMEIs
    if (product.isSerialized) {
      if (!imeis || imeis.length !== quantity) {
        throw new BadRequestException(
          'Serialized products require IMEI list matching quantity',
        );
      }

      // Verify IMEIs exist and are IN_STOCK
      const availableIMEIs = await prisma.iMEI.findMany({
        where: {
          imei: { in: imeis },
          shopProductId: productId,
          tenantId,
          status: IMEIStatus.IN_STOCK,
        },
      });

      if (availableIMEIs.length !== quantity) {
        throw new BadRequestException(
          `Some IMEIs are not available. Need: ${quantity}, Available: ${availableIMEIs.length}`,
        );
      }
    } else {
      // For bulk products, optionally allow negative stock if enabled in settings
      const allowNegativeBulk = !!this.config.get<boolean>(
        'ALLOW_NEGATIVE_BULK_STOCK',
      );

      if (!allowNegativeBulk) {
        const currentStock = await this.getCurrentStock(productId, tenantId); // Note: getCurrentStock might use this.prisma, technically outside TX but okay for read check if strictly serializable, otherwise slightly race-y but acceptable for now.
        if (currentStock < quantity) {
          throw new BadRequestException(
            `Insufficient stock for ${product.name}. Available: ${currentStock}, Required: ${quantity}`,
          );
        }
      }
      // If allowed, skip availability check and let ledger go negative
    }

    // Create StockLedger OUT entry
    return prisma.stockLedger.create({
      data: {
        tenantId,
        shopId,
        shopProductId: productId,
        type: 'OUT',
        quantity,
        referenceType,
        referenceId,
        costPerUnit,
      },
    });
  }

  // Validate and record stock IN (used for reversals/returns/transfers)
  async recordStockIn(
    tenantId: string,
    shopId: string,
    productId: string,
    quantity: number,
    referenceType: 'PURCHASE' | 'SALE' | 'REPAIR' | 'ADJUSTMENT' | 'ADJUSTMENT',
    referenceId: string | null,
    costPerUnit?: number,
    imeis?: string[],
    tx?: any,
  ) {
    const prisma = tx || this.prisma;
    const product = await prisma.shopProduct.findFirst({
      where: { id: productId, tenantId, isActive: true },
      select: { id: true, type: true, isSerialized: true, name: true },
    });

    if (!product) {
      throw new BadRequestException('Product not found');
    }

    // SERVICE products cannot have stock operations
    if (product.type === ProductType.SERVICE) {
      throw new BadRequestException(
        `SERVICE product "${product.name}" cannot have stock operations`,
      );
    }

    if (quantity <= 0) {
      throw new BadRequestException('Quantity must be positive');
    }

    // For serialized products, if IMEIs are provided ensure count matches
    if (product.isSerialized) {
      if (imeis && imeis.length !== quantity) {
        throw new BadRequestException(
          'Serialized products require IMEI list matching quantity',
        );
      }
      // IMEI status updates (e.g., to IN_STOCK) are handled by calling services
    }

    // 🛡️ FIX 2: COST DISCIPLINE FOR ADJUSTMENTS
    // For stock corrections (ADJUSTMENT), cost must be provided or exist in ShopProduct
    if (referenceType === 'ADJUSTMENT') {
      let effectiveCost = costPerUnit;

      // If cost not provided, try to get from ShopProduct.costPrice
      if (!effectiveCost || effectiveCost <= 0) {
        const shopProduct = await prisma.shopProduct.findUnique({
          where: { id: productId },
          select: { costPrice: true },
        });
        effectiveCost = shopProduct?.costPrice || null;
      }

      // If still no valid cost, reject the operation
      if (!effectiveCost || effectiveCost <= 0) {
        throw new BadRequestException(
          `Stock correction requires a valid cost price for product "${product.name}". ` +
            `Please ensure the product has a cost price from a prior purchase.`,
        );
      }

      // Update costPerUnit to the validated cost for consistency
      costPerUnit = effectiveCost;
    }

    return prisma.stockLedger.create({
      data: {
        tenantId,
        shopId,
        shopProductId: productId,
        type: 'IN',
        quantity,
        referenceType,
        referenceId,
        costPerUnit,
      },
    });
  }
  async stockInSingleProduct(tenantId: string, dto: StockInDto) {
    const product = await this.prisma.shopProduct.findFirst({
      where: { id: dto.productId, tenantId, isActive: true },
      select: {
        id: true,
        shopId: true,
        type: true,
        isSerialized: true,
        avgCost: true, // Get current avgCost for WAC calculation
      },
    });

    if (!product) {
      throw new BadRequestException('Invalid product');
    }

    if (dto.type && dto.type !== product.type) {
      throw new BadRequestException('Product type mismatch');
    }

    // SERVICE products cannot have stock IN
    if (product.type === ProductType.SERVICE) {
      throw new BadRequestException(
        'SERVICE products cannot have stock entries',
      );
    }

    // Determine quantity: for serialized products, use IMEI count
    const quantity =
      product.isSerialized && dto.imeis?.length
        ? dto.imeis.length
        : (dto.quantity ?? 0);

    if (!quantity) {
      throw new BadRequestException('Quantity required');
    }

    // For serialized products, IMEIs are mandatory
    if (product.isSerialized && !dto.imeis?.length) {
      throw new BadRequestException('Serialized products require IMEI list');
    }

    // Create stock ledger entry with WAC calculation
    return this.prisma.$transaction(async (tx) => {
      // Get current stock quantity
      const entries = await tx.stockLedger.findMany({
        where: { shopProductId: product.id, tenantId },
        select: { type: true, quantity: true },
      });

      const currentQty = entries.reduce((sum, e) => {
        return e.type === 'IN' ? sum + e.quantity : sum - e.quantity;
      }, 0);

      // Calculate new Weighted Average Cost (WAC)
      const newCostPerUnit = dto.costPerUnit || 0;
      const currentAvgCost = product.avgCost || 0;

      // Formula: newAvgCost = ((oldQty × oldAvgCost) + (inQty × inCost)) / (oldQty + inQty)
      const newAvgCost =
        currentQty > 0
          ? Math.round(
              (currentQty * currentAvgCost + quantity * newCostPerUnit) /
                (currentQty + quantity),
            )
          : newCostPerUnit; // First stock IN: avgCost = costPerUnit

      const ledgerEntry = {
        tenantId,
        shopId: product.shopId,
        shopProductId: product.id,
        type: 'IN' as const,
        quantity,
        referenceType: 'PURCHASE' as const,
        referenceId: null,
        costPerUnit: dto.costPerUnit,
      };

      await tx.stockLedger.create({ data: ledgerEntry });

      // Update ShopProduct with new avgCost
      await tx.shopProduct.update({
        where: { id: product.id },
        data: { avgCost: newAvgCost },
      });

      // Handle IMEIs for serialized products
      if (product.isSerialized && dto.imeis?.length) {
        await tx.iMEI.createMany({
          data: dto.imeis.map((imei) => ({
            tenantId,
            shopProductId: product.id,
            imei,
            status: IMEIStatus.IN_STOCK,
          })),
          skipDuplicates: true,
        });
      }

      return { success: true, avgCost: newAvgCost };
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
