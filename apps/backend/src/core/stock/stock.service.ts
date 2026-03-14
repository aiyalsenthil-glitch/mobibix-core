import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProductType, IMEIStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { StockInDto } from '../inventory/dto/stock-in.dto';
import {
  validateIMEIs,
  validateIMEIQuantity,
} from './stock-serialization.validation';

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

  // Calculate current stock (Optimized: reads scalar field, fallback to ledger only if necessary)
  async getCurrentStock(
    productId: string,
    tenantId: string,
    tx?: any,
  ): Promise<number> {
    const prisma = tx || this.prisma;
    const product = await prisma.shopProduct.findUnique({
      where: { id: productId },
      select: { quantity: true, isSerialized: true, type: true },
    });

    if (!product) return 0;

    // For serialized products, we still count IMEIs to be 100% sure, 
    // but the scalar 'quantity' field should ideally be in sync.
    if (product.isSerialized) {
      return await prisma.iMEI.count({
        where: {
          shopProductId: productId,
          tenantId,
          status: IMEIStatus.IN_STOCK,
        },
      });
    }

    return product.quantity;
  }

  // Validate and record stock OUT (with validation and atomic sync)
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
    if (quantity <= 0) return;

    const executeInTransaction = async (prisma: Prisma.TransactionClient) => {
      // 🛡️ LOCK: Acquire row-level lock on the product immediately
      const product = await prisma.shopProduct.findUnique({
        where: { id: productId },
        select: { 
          id: true, 
          type: true, 
          isSerialized: true, 
          name: true, 
          quantity: true,
          avgCost: true,
          totalValue: true 
        },
      });
      
      // Manual LOCK because findUnique doesn't support FOR UPDATE in all versions or is risky
      await prisma.$executeRaw`SELECT id FROM "mb_shop_product" WHERE id = ${productId} FOR UPDATE`;

      if (!product || !product.id) {
        throw new BadRequestException('Product not found');
      }

      if (product.type === ProductType.SERVICE) {
        throw new BadRequestException(`SERVICE product "${product.name}" cannot have stock operations`);
      }

      // Serialized validation
      if (product.isSerialized) {
        if (!imeis || imeis.length !== quantity) {
          throw new BadRequestException('Serialized products require IMEI list matching quantity');
        }

        const availableIMEIs = await prisma.iMEI.count({
          where: {
            imei: { in: imeis },
            shopProductId: productId,
            tenantId,
            status: IMEIStatus.IN_STOCK,
          },
        });

        if (availableIMEIs !== quantity) {
          throw new BadRequestException(`Some IMEIs are not available in stock.`);
        }

        // Mark IMEIs as SOLD/RESERVED depending on reference
        const newStatus = referenceType === 'SALE' ? IMEIStatus.SOLD : IMEIStatus.SCRAPPED; 
        await prisma.iMEI.updateMany({
          where: { imei: { in: imeis }, shopProductId: productId, tenantId },
          data: { 
            status: newStatus,
            invoiceId: referenceType === 'SALE' ? referenceId : null,
            updatedAt: new Date() 
          },
        });
      } else {
          const allowNegativeBulk = !!this.config.get<boolean>('ALLOW_NEGATIVE_BULK_STOCK');
          if (!allowNegativeBulk && (product as any).quantity < quantity) {
            throw new BadRequestException(`Insufficient stock for ${product.name}. Available: ${(product as any).quantity}, Required: ${quantity}`);
          }
      }

      // 1. Create Ledger Entry
      await prisma.stockLedger.create({
        data: {
          tenantId,
          shopId,
          shopProductId: productId,
          type: 'OUT',
          quantity,
          referenceType,
          referenceId,
          costPerUnit: costPerUnit ?? (product as any).avgCost ?? null,
        },
      });

      // 2. Update ShopProduct Scalar Fields (Atomic Increment)
      await prisma.shopProduct.update({
        where: { id: productId },
        data: {
          quantity: { decrement: quantity },
          totalValue: { decrement: BigInt(quantity) * BigInt((product as any).avgCost || 0) }
        }
      });
    };

    if (tx) {
      return await executeInTransaction(tx);
    } else {
      return await this.prisma.$transaction(async (t) => await executeInTransaction(t));
    }
  }

  // Batch stock OUT (Standardized with Enterprise Locking)
  async recordStockOutBatch(
    tenantId: string,
    shopId: string,
    items: {
      productId: string;
      quantity: number;
      costPerUnit?: number;
      imeis?: string[];
      note?: string;
    }[],
    referenceType: 'PURCHASE' | 'SALE' | 'REPAIR' | 'ADJUSTMENT',
    referenceId: string | null,
    tx?: any,
  ) {
    if (!items.length) return;

    const executeInTransaction = async (prisma: Prisma.TransactionClient) => {
      const productIds = [...new Set(items.map((i) => i.productId))].sort();

      // 🛡️ LOCK: Sort IDs and acquire row-level locks to prevent deadlocks
      for (const pid of productIds) {
        await prisma.$executeRaw`SELECT id FROM "mb_shop_product" WHERE id = ${pid} FOR UPDATE`;
      }

      // Bulk fetch products with current stock/value
      const products = await prisma.shopProduct.findMany({
        where: { id: { in: productIds }, tenantId, isActive: true },
        select: { id: true, type: true, isSerialized: true, name: true, quantity: true, avgCost: true, totalValue: true },
      });

      const productMap = new Map(products.map((p) => [p.id, p]));
      const allowNegativeBulk = !!this.config.get<boolean>('ALLOW_NEGATIVE_BULK_STOCK');

      // Validation & Meta Calculation
      const updates: Prisma.ShopProductUpdateArgs[] = [];
      const ledgerEntries: any[] = [];

      for (const item of items) {
        const p = productMap.get(item.productId);
        if (!p) throw new BadRequestException(`Product ${item.productId} not found`);
        if (p.type === ProductType.SERVICE) throw new BadRequestException(`SERVICE product "${p.name}" cannot have stock operations`);

        if (p.isSerialized) {
          if (!item.imeis || item.imeis.length !== item.quantity) {
            throw new BadRequestException(`Serialized product "${p.name}" requires IMEI list matching quantity`);
          }
          const availableCount = await prisma.iMEI.count({
            where: { imei: { in: item.imeis }, shopProductId: item.productId, tenantId, status: IMEIStatus.IN_STOCK },
          });
          if (availableCount !== item.quantity) throw new BadRequestException(`Some IMEIs for "${p.name}" are not available.`);
          
          const newStatus = referenceType === 'SALE' ? IMEIStatus.SOLD : IMEIStatus.SCRAPPED;
          await prisma.iMEI.updateMany({
            where: { imei: { in: item.imeis }, shopProductId: item.productId, tenantId },
            data: { status: newStatus, invoiceId: referenceType === 'SALE' ? referenceId : null, updatedAt: new Date() },
          });
        } else if (!allowNegativeBulk && (p as any).quantity < item.quantity) {
          throw new BadRequestException(`Insufficient stock for ${p.name}. Available: ${(p as any).quantity}, Required: ${item.quantity}`);
        }

        ledgerEntries.push({
          tenantId,
          shopId,
          shopProductId: item.productId,
          type: 'OUT' as const,
          quantity: item.quantity,
          referenceType,
          referenceId,
          costPerUnit: item.costPerUnit ?? (p as any).avgCost ?? null,
          note: item.note,
        });

        // Value calculation
        const valueReduction = BigInt(item.quantity) * BigInt((p as any).avgCost || 0);
        const newTotalValue = (p as any).totalValue > valueReduction ? (p as any).totalValue - valueReduction : BigInt(0);
        
        // Accumulate updates (note: if multi items same product, this needs careful merging, but we already sorted/unique productIds above for locking)
        // Actually, the loop is over 'items', which might contain the same productId multiple times. 
        // We should merge them or just use atomic increments in DB.
      }

      // Execution
      await prisma.stockLedger.createMany({ data: ledgerEntries });
      
      // Atomic increments/decrements are safer than calculated overwrites for batch
      for (const pid of productIds) {
        const itemQuantity = items.filter(i => i.productId === pid).reduce((sum, i) => sum + i.quantity, 0);
        const p = productMap.get(pid)!;
        const totalValueReduction = BigInt(itemQuantity) * BigInt((p as any).avgCost || 0);
        const newTotalValue = (p as any).totalValue > totalValueReduction ? (p as any).totalValue - totalValueReduction : BigInt(0);

        await prisma.shopProduct.update({
          where: { id: pid },
            data: {
              quantity: { decrement: itemQuantity },
              totalValue: { decrement: BigInt(itemQuantity) * BigInt((p as any).avgCost || 0) }
            }
          });
        }
      };

    if (tx) return await executeInTransaction(tx);
    else return await this.prisma.$transaction(async (t) => await executeInTransaction(t));
  }

  // Batch stock IN (WAC Enabled)
  async recordStockInBatch(
    tenantId: string,
    shopId: string,
    items: {
      productId: string;
      quantity: number;
      costPerUnit?: number;
      imeis?: string[];
      note?: string;
    }[],
    referenceType: 'PURCHASE' | 'SALE' | 'REPAIR' | 'ADJUSTMENT',
    referenceId: string | null,
    tx?: any,
  ) {
    if (!items.length) return;

    const executeInTransaction = async (prisma: Prisma.TransactionClient) => {
      const productIds = [...new Set(items.map((i) => i.productId))].sort();

      // 🛡️ LOCK: Prevent race conditions in WAC calculation
      for (const pid of productIds) {
        await prisma.$executeRaw`SELECT id FROM "mb_shop_product" WHERE id = ${pid} FOR UPDATE`;
      }

      const products = await prisma.shopProduct.findMany({
        where: { id: { in: productIds }, tenantId, isActive: true },
        select: { id: true, type: true, isSerialized: true, name: true, quantity: true, avgCost: true, totalValue: true },
      });

      const productMap = new Map(products.map((p) => [p.id, p]));

      for (const pid of productIds) {
        const itemGroup = items.filter(i => i.productId === pid);
        const p = productMap.get(pid);
        if (!p) throw new BadRequestException(`Product ${pid} not found`);

        const totalInQty = itemGroup.reduce((sum, i) => sum + i.quantity, 0);
        const totalInValue = itemGroup.reduce((sum, i) => {
          const cost = (i.costPerUnit || (p as any).avgCost || 0);
          return sum + (BigInt(i.quantity) * BigInt(cost));
        }, BigInt(0));

        // WAC Recalculation: (CurrentValue + InValue) / (CurrentQty + InQty)
        const currentQty = (p as any).quantity || 0;
        const currentTotalValue = (p as any).totalValue || BigInt(0);
        const newTotalQty = currentQty + totalInQty;
        const newTotalValue = currentTotalValue + totalInValue;
        const newAvgCost = newTotalQty > 0 ? Number(newTotalValue / BigInt(newTotalQty)) : Number(totalInValue / BigInt(totalInQty || 1));

        // Update ShopProduct
        await prisma.shopProduct.update({
          where: { id: pid },
          data: {
            quantity: { increment: totalInQty },
            totalValue: newTotalValue,
            avgCost: newAvgCost,
            lastPurchasePrice: itemGroup[itemGroup.length - 1].costPerUnit || p.avgCost || 0,
            updatedAt: new Date(),
          },
        });

        // Ledger entries
        const ledgerEntries = itemGroup.map(item => ({
          tenantId,
          shopId,
          shopProductId: pid,
          type: 'IN' as const,
          quantity: item.quantity,
          referenceType,
          referenceId,
          costPerUnit: item.costPerUnit ?? p.avgCost ?? null,
          note: item.note,
        }));
        await prisma.stockLedger.createMany({ data: ledgerEntries });

        // IMEI handling
        if (p.isSerialized) {
          for (const item of itemGroup) {
            if (item.imeis?.length) {
              // Check for existing IMEIs before insert — reject duplicates explicitly
              const existing = await prisma.iMEI.findMany({
                where: { tenantId, imei: { in: item.imeis } },
                select: { imei: true },
              });
              if (existing.length > 0) {
                throw new BadRequestException(
                  `IMEI(s) already exist in inventory: ${existing.map(e => e.imei).join(', ')}`,
                );
              }
              await prisma.iMEI.createMany({
                data: item.imeis.map(imei => ({
                  tenantId,
                  shopId,
                  shopProductId: pid,
                  imei,
                  status: IMEIStatus.IN_STOCK,
                  updatedAt: new Date(),
                })),
              });
            }
          }
        }
      }
    };

    if (tx) return await executeInTransaction(tx);
    else return await this.prisma.$transaction(async (t) => await executeInTransaction(t));
  }

  // Single stock IN (Refactored to use Batch logic for consistency)
  async recordStockIn(
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
    return this.recordStockInBatch(
      tenantId,
      shopId,
      [{ productId, quantity, costPerUnit, imeis }],
      referenceType,
      referenceId,
      tx,
    );
  }

  private toPaisa(
    amount: number | undefined | null,
  ): number | undefined | null {
    if (amount === undefined || amount === null) return amount;
    return Math.round(amount * 100);
  }

  // DEPRECATED: Use recordStockIn instead for unified logic
  async stockInSingleProduct(tenantId: string, dto: StockInDto) {
    const product = await this.prisma.shopProduct.findUnique({
      where: { id: dto.productId },
      select: { shopId: true },
    });
    if (!product) throw new BadRequestException('Product not found');

    const costPaisa = this.toPaisa(dto.costPerUnit) || 0;
    const result = await this.recordStockIn(
      tenantId,
      product.shopId,
      dto.productId,
      dto.quantity || (dto.imeis?.length ?? 0),
      'PURCHASE', // Default for this vintage DTO
      null,
      costPaisa,
      dto.imeis,
    );
    
    // Maintain interface compatibility for controllers
    return { success: true }; 
  }

  async getStockBalances(
    tenantId: string,
    shopId?: string,
  ): Promise<StockBalance[]> {
    const products = await this.prisma.shopProduct.findMany({
      where: {
        tenantId,
        isActive: true,
        ...(shopId ? { shopId } : {}),
      },
      select: {
        id: true,
        name: true,
        quantity: true,
      },
      orderBy: { name: 'asc' },
    });

    return products.map((p) => ({
      productId: p.id,
      name: p.name,
      stockQty: p.quantity,
      isNegative: p.quantity < 0,
    }));
  }

  async getStockOverview(tenantId: string, shopId?: string) {
    const products = await this.prisma.shopProduct.findMany({
      where: {
        tenantId,
        isActive: true,
        ...(shopId ? { shopId } : {}),
      },
      select: {
        id: true,
        type: true,
        isSerialized: true,
        costPrice: true,
        avgCost: true,
        salePrice: true,
        reorderLevel: true,
        quantity: true,
        totalValue: true,
      },
    });

    let totalProducts = 0;
    let totalItems = 0;
    let totalValue = BigInt(0);
    let lowStockItems = 0;
    let potentialRevenue = 0;

    for (const p of products) {
      if (p.type === ProductType.SERVICE) continue;

      totalProducts++;
      const count = Math.max(0, p.quantity);
      totalItems += count;
      totalValue += p.totalValue;
      potentialRevenue += count * (p.salePrice || 0);

      if (p.quantity <= (p.reorderLevel || 0)) {
        lowStockItems++;
      }
    }

    return {
      totalProducts,
      totalItems,
      totalValue: Number(totalValue) / 100,
      lowStockItems,
      potentialRevenue: potentialRevenue / 100,
    };
  }

  async getImeiDetails(tenantId: string, imei: string) {
    const imeiRecord = await this.prisma.iMEI.findUnique({
      where: { tenantId_imei: { tenantId, imei } },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            type: true,
            isSerialized: true,
            salePrice: true,
            costPrice: true,
            gstRate: true,
            hsnCode: true,
          },
        },
      },
    });

    if (!imeiRecord) {
      throw new BadRequestException(`IMEI "${imei}" not found in your inventory.`);
    }

    if (imeiRecord.product) {
      (imeiRecord.product as any).salePrice = (imeiRecord.product.salePrice || 0) / 100;
      (imeiRecord.product as any).costPrice = (imeiRecord.product.costPrice || 0) / 100;
    }

    return imeiRecord;
  }

  async getImeiList(
    tenantId: string,
    filters: {
      status?: IMEIStatus;
      shopId?: string;
      productId?: string;
      search?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const { status, shopId, productId, search, page = 1, limit = 50 } = filters;
    const where: any = { tenantId };
    if (status) where.status = status;
    if (shopId) where.shopId = shopId;
    if (productId) where.shopProductId = productId;
    if (search) where.imei = { contains: search };

    const [items, total] = await Promise.all([
      this.prisma.iMEI.findMany({
        where,
        include: {
          product: { select: { id: true, name: true, type: true } },
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              invoiceDate: true,
              customerName: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.iMEI.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async updateImeiStatus(
    tenantId: string,
    imei: string,
    status: IMEIStatus,
    notes?: string,
  ) {
    const allowedTransitions: Partial<Record<IMEIStatus, IMEIStatus[]>> = {
      [IMEIStatus.SOLD]: [IMEIStatus.RETURNED, IMEIStatus.RETURNED_GOOD, IMEIStatus.RETURNED_DAMAGED],
      [IMEIStatus.IN_STOCK]: [IMEIStatus.DAMAGED, IMEIStatus.LOST, IMEIStatus.SCRAPPED, IMEIStatus.RESERVED],
      [IMEIStatus.RESERVED]: [IMEIStatus.IN_STOCK, IMEIStatus.SOLD],
      [IMEIStatus.RETURNED]: [IMEIStatus.IN_STOCK, IMEIStatus.DAMAGED, IMEIStatus.SCRAPPED],
      [IMEIStatus.RETURNED_GOOD]: [IMEIStatus.IN_STOCK],
      [IMEIStatus.RETURNED_DAMAGED]: [IMEIStatus.DAMAGED, IMEIStatus.SCRAPPED],
    };

    const record = await this.prisma.iMEI.findUnique({
      where: { tenantId_imei: { tenantId, imei } },
    });
    if (!record) throw new BadRequestException(`IMEI "${imei}" not found.`);

    const allowed = allowedTransitions[record.status] || [];
    if (!allowed.includes(status)) {
      throw new BadRequestException(
        `Cannot transition IMEI from ${record.status} to ${status}.`,
      );
    }

    const updateData: any = { status, updatedAt: new Date() };

    if ([IMEIStatus.RETURNED, IMEIStatus.RETURNED_GOOD, IMEIStatus.RETURNED_DAMAGED].includes(status)) {
      updateData.returnedAt = new Date();
      updateData.invoiceId = null;
    }
    if (notes) {
      if ([IMEIStatus.DAMAGED, IMEIStatus.RETURNED_DAMAGED].includes(status)) updateData.damageNotes = notes;
      if (status === IMEIStatus.LOST) updateData.lostReason = notes;
    }

    // Returning to IN_STOCK from a return state — increment product stock
    const returningToStock =
      status === IMEIStatus.IN_STOCK &&
      [IMEIStatus.RETURNED, IMEIStatus.RETURNED_GOOD].includes(record.status);

    if (returningToStock) {
      await this.prisma.$transaction([
        this.prisma.iMEI.update({ where: { tenantId_imei: { tenantId, imei } }, data: updateData }),
        this.prisma.shopProduct.update({
          where: { id: record.shopProductId },
          data: { quantity: { increment: 1 } },
        }),
      ]);
      return { success: true, imei, status };
    }

    await this.prisma.iMEI.update({ where: { tenantId_imei: { tenantId, imei } }, data: updateData });
    return { success: true, imei, status };
  }

  async transferImei(tenantId: string, imei: string, targetShopId: string) {
    const record = await this.prisma.iMEI.findUnique({
      where: { tenantId_imei: { tenantId, imei } },
    });
    if (!record) throw new BadRequestException(`IMEI "${imei}" not found.`);
    if (record.status !== IMEIStatus.IN_STOCK && record.status !== IMEIStatus.RESERVED) {
      throw new BadRequestException(
        `Only IN_STOCK or RESERVED IMEIs can be transferred. Current: ${record.status}`,
      );
    }
    if (record.shopId === targetShopId) {
      throw new BadRequestException('IMEI is already in the target shop.');
    }

    const shop = await this.prisma.shop.findFirst({
      where: { id: targetShopId, tenantId },
      select: { id: true },
    });
    if (!shop) throw new BadRequestException('Target shop not found.');

    return this.prisma.iMEI.update({
      where: { tenantId_imei: { tenantId, imei } },
      data: {
        shopId: targetShopId,
        transferredToShopId: targetShopId,
        status: IMEIStatus.IN_STOCK,
        updatedAt: new Date(),
      },
    });
  }

  async reserveImei(tenantId: string, imei: string) {
    const record = await this.prisma.iMEI.findUnique({
      where: { tenantId_imei: { tenantId, imei } },
    });
    if (!record) throw new BadRequestException(`IMEI "${imei}" not found.`);
    if (record.status !== IMEIStatus.IN_STOCK) {
      throw new BadRequestException(
        `Only IN_STOCK IMEIs can be reserved. Current: ${record.status}`,
      );
    }
    return this.prisma.iMEI.update({
      where: { tenantId_imei: { tenantId, imei } },
      data: { status: IMEIStatus.RESERVED, updatedAt: new Date() },
    });
  }

  async releaseImeiReserve(tenantId: string, imei: string) {
    const record = await this.prisma.iMEI.findUnique({
      where: { tenantId_imei: { tenantId, imei } },
    });
    if (!record) throw new BadRequestException(`IMEI "${imei}" not found.`);
    if (record.status !== IMEIStatus.RESERVED) {
      throw new BadRequestException(`IMEI is not reserved. Current: ${record.status}`);
    }
    return this.prisma.iMEI.update({
      where: { tenantId_imei: { tenantId, imei } },
      data: { status: IMEIStatus.IN_STOCK, updatedAt: new Date() },
    });
  }
}
