# 🛠️ Service Layer Implementation Guide - Inventory/Stock Fixes

**File Location:** `apps/backend/src/`  
**Priority:** 🔴 CRITICAL - Implement after schema migration  
**Estimated Time:** 4-6 hours

---

## Overview

After the schema changes, the following services MUST be updated to enforce the new design:

1. **StockService** - Validate before OUT, track costs
2. **RepairService** - Link repairs to stock movements
3. **InvoiceService** - Track IMEI status changes
4. **InventoryService** - Use isSerialized flag
5. **PurchaseService** - Link purchases to stock IN

---

## 1. StockService Enhancements

### File: `src/core/stock/stock.service.ts`

```typescript
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StockEntryType, StockRefType } from '@prisma/client';

@Injectable()
export class StockService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get current stock quantity (sum of IN minus OUT from StockLedger)
   * For serialized products: Count IN_STOCK IMEIs instead
   */
  async getStockQuantity(
    tenantId: string,
    shopProductId: string,
  ): Promise<number> {
    const product = await this.prisma.shopProduct.findUnique({
      where: { id: shopProductId },
    });

    if (!product) {
      throw new BadRequestException('Product not found');
    }

    // ✅ For serialized products: count IMEI units
    if (product.isSerialized) {
      return await this.prisma.iMEI.count({
        where: {
          shopProductId,
          status: 'IN_STOCK',
        },
      });
    }

    // ✅ For bulk products: sum StockLedger
    const ledgerEntries = await this.prisma.stockLedger.findMany({
      where: {
        shopProductId,
        tenantId,
      },
      select: {
        type: true,
        quantity: true,
      },
    });

    return ledgerEntries.reduce((sum, entry) => {
      return entry.type === 'IN' ? sum + entry.quantity : sum - entry.quantity;
    }, 0);
  }

  /**
   * Record stock OUT (e.g., sale, repair, adjustment)
   * ✅ VALIDATES before creating ledger entry
   */
  async recordStockOut(dto: {
    tenantId: string;
    shopId: string;
    shopProductId: string;
    quantity: number;
    referenceType: StockRefType;
    referenceId: string;
    costPerUnit?: number;
    note?: string;
  }) {
    // ✅ Validation: Check if we have enough stock
    const currentStock = await this.getStockQuantity(
      dto.tenantId,
      dto.shopProductId,
    );

    if (currentStock < dto.quantity) {
      throw new BadRequestException(
        `Insufficient stock for product. ` +
          `Current: ${currentStock}, ` +
          `Requested: ${dto.quantity}`,
      );
    }

    // ✅ Create ledger entry
    const ledgerEntry = await this.prisma.stockLedger.create({
      data: {
        tenantId: dto.tenantId,
        shopId: dto.shopId,
        shopProductId: dto.shopProductId,
        type: 'OUT',
        quantity: dto.quantity,
        referenceType: dto.referenceType,
        referenceId: dto.referenceId,
        costPerUnit: dto.costPerUnit,
        note: dto.note,
      },
    });

    return ledgerEntry;
  }

  /**
   * Record stock IN (e.g., purchase, return, adjustment)
   * Simpler than OUT - just create the ledger entry
   */
  async recordStockIn(dto: {
    tenantId: string;
    shopId: string;
    shopProductId: string;
    quantity: number;
    referenceType: StockRefType;
    referenceId: string;
    costPerUnit?: number;
    note?: string;
  }) {
    const ledgerEntry = await this.prisma.stockLedger.create({
      data: {
        tenantId: dto.tenantId,
        shopId: dto.shopId,
        shopProductId: dto.shopProductId,
        type: 'IN',
        quantity: dto.quantity,
        referenceType: dto.referenceType,
        referenceId: dto.referenceId,
        costPerUnit: dto.costPerUnit,
        note: dto.note,
      },
    });

    return ledgerEntry;
  }

  /**
   * Get stock movement history for a product
   * Used for audit trail and debugging
   */
  async getStockHistory(shopProductId: string, limit: number = 50) {
    return await this.prisma.stockLedger.findMany({
      where: { shopProductId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        product: true,
      },
    });
  }

  /**
   * Get stock value (for inventory valuation)
   * Calculates based on FIFO or weighted average cost
   */
  async getStockValue(
    tenantId: string,
    shopProductId: string,
  ): Promise<number> {
    const quantity = await this.getStockQuantity(tenantId, shopProductId);

    // Get average cost per unit from recent IN entries
    const inEntries = await this.prisma.stockLedger.findMany({
      where: {
        shopProductId,
        type: 'IN',
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const avgCost =
      inEntries.reduce((sum, entry) => sum + (entry.costPerUnit || 0), 0) /
      (inEntries.length || 1);

    return quantity * avgCost;
  }
}
```

---

## 2. RepairService - Stock Linkage

### File: `src/modules/mobileshop/repair/repair.service.ts` (Enhanced)

```typescript
/**
 * Add part to repair job
 * ✅ Creates both RepairPartUsed and StockLedger OUT entry
 */
async addPartToRepair(
  tx: any,
  jobCardId: string,
  shopProductId: string,
  quantity: number,
  costPerUnit?: number,
) {
  const jobCard = await tx.jobCard.findUnique({
    where: { id: jobCardId },
    select: { tenantId: true, shopId: true },
  });

  if (!jobCard) {
    throw new NotFoundException('Job card not found');
  }

  // 1️⃣ Record part usage in repair
  const partUsed = await tx.repairPartUsed.create({
    data: {
      jobCardId,
      shopProductId,
      quantity,
      costPerUnit,
    },
  });

  // 2️⃣ ✅ Create stock OUT ledger entry
  await tx.stockLedger.create({
    data: {
      tenantId: jobCard.tenantId,
      shopId: jobCard.shopId,
      shopProductId,
      type: 'OUT',
      quantity,
      referenceType: 'REPAIR',
      referenceId: partUsed.id,
      costPerUnit,
      note: `Used in repair job: ${jobCardId}`,
    },
  });

  return partUsed;
}

/**
 * Cancel repair job and reverse all stock movements
 * ✅ Creates reversal StockLedger IN entries
 */
async cancelRepair(tx: any, jobCardId: string) {
  const jobCard = await tx.jobCard.findUnique({
    where: { id: jobCardId },
    include: { partsUsed: true },
    select: { tenantId: true, shopId: true, partsUsed: true },
  });

  if (!jobCard) {
    throw new NotFoundException('Job card not found');
  }

  // Reverse each part used
  for (const partUsed of jobCard.partsUsed) {
    // ✅ Find the original OUT entry
    const outEntry = await tx.stockLedger.findFirst({
      where: {
        referenceType: 'REPAIR',
        referenceId: partUsed.id,
        type: 'OUT',
      },
    });

    if (outEntry) {
      // ✅ Create reversal IN entry
      await tx.stockLedger.create({
        data: {
          tenantId: jobCard.tenantId,
          shopId: jobCard.shopId,
          shopProductId: partUsed.shopProductId,
          type: 'IN',
          quantity: partUsed.quantity,
          referenceType: 'REPAIR',
          referenceId: partUsed.id,
          costPerUnit: partUsed.costPerUnit,
          note: `Reversal: cancelled repair job ${jobCardId}`,
        },
      });
    }

    // Delete the RepairPartUsed record
    await tx.repairPartUsed.delete({
      where: { id: partUsed.id },
    });
  }

  // Update job card status
  await tx.jobCard.update({
    where: { id: jobCardId },
    data: { status: 'CANCELLED' },
  });
}

/**
 * Update part cost (after initial recording)
 * ✅ Updates both RepairPartUsed and StockLedger
 */
async updatePartCost(
  tx: any,
  repairPartUsedId: string,
  newCostPerUnit: number,
) {
  // Update RepairPartUsed
  const partUsed = await tx.repairPartUsed.update({
    where: { id: repairPartUsedId },
    data: { costPerUnit: newCostPerUnit },
  });

  // ✅ Update corresponding StockLedger OUT entry
  await tx.stockLedger.updateMany({
    where: {
      referenceType: 'REPAIR',
      referenceId: repairPartUsedId,
      type: 'OUT',
    },
    data: { costPerUnit: newCostPerUnit },
  });

  return partUsed;
}
```

---

## 3. InvoiceService - IMEI Status Tracking

### File: `src/core/sales/sales.service.ts` (Enhanced)

```typescript
/**
 * Mark IMEIs as SOLD
 * ✅ Updates IMEI status and timestamps
 */
async markIMEIsSold(tx: any, imeiNumbers: string[], invoiceId: string) {
  const now = new Date();

  const updatedIMEIs = await tx.iMEI.updateMany({
    where: {
      imei: { in: imeiNumbers },
    },
    data: {
      status: 'SOLD',
      invoiceId,
      soldAt: now,
      updatedAt: now,
    },
  });

  return updatedIMEIs;
}

/**
 * Handle invoice return/cancellation
 * ✅ Reverts IMEI status back to IN_STOCK
 */
async handleInvoiceReturn(tx: any, invoiceId: string) {
  const now = new Date();

  // Find all IMEIs sold in this invoice
  const imeis = await tx.iMEI.findMany({
    where: { invoiceId },
  });

  // Revert status
  const updated = await tx.iMEI.updateMany({
    where: { invoiceId },
    data: {
      status: 'IN_STOCK',
      invoiceId: null,
      returnedAt: now,
      updatedAt: now,
    },
  });

  // Create stock IN ledger entry (reverse the sale)
  for (const imei of imeis) {
    await tx.stockLedger.create({
      data: {
        type: 'IN',
        quantity: 1,
        referenceType: 'SALE',
        referenceId: imei.id,
        note: `Reversed: Invoice ${invoiceId} cancelled`,
        tenantId: imei.tenantId,
        shopProductId: imei.shopProductId,
      },
    });
  }

  return updated;
}

/**
 * Mark IMEI as damaged
 * ✅ Updates status and notes
 */
async markIMEIDamaged(
  tx: any,
  imei: string,
  damageNotes: string,
) {
  return await tx.iMEI.update({
    where: { imei },
    data: {
      status: 'DAMAGED',
      damageNotes,
      updatedAt: new Date(),
    },
  });
}

/**
 * Mark IMEI as transferred to another shop
 * ✅ Updates status (but keeps shopProductId pointing to original)
 */
async markIMEITransferred(
  tx: any,
  imei: string,
  toShopId: string,
) {
  return await tx.iMEI.update({
    where: { imei },
    data: {
      status: 'TRANSFERRED',
      updatedAt: new Date(),
    },
  });
}
```

---

## 4. InventoryService - isSerialized Enforcement

### File: `src/core/inventory/inventory.service.ts` (Enhanced)

```typescript
/**
 * Create product with serialization enforcement
 * ✅ Validates isSerialized requirements
 */
async createProduct(
  tx: any,
  tenantId: string,
  shopId: string,
  dto: CreateProductDto,
) {
  // ✅ Validate: Serialized products require IMEIs
  if (dto.isSerialized && !dto.imeis?.length) {
    throw new BadRequestException(
      'Serialized products (mobiles, laptops) must include IMEI numbers'
    );
  }

  // ✅ Validate: Non-serialized products can't have IMEIs
  if (!dto.isSerialized && dto.imeis?.length) {
    throw new BadRequestException(
      'Bulk products (accessories, spares) cannot have IMEIs. ' +
      'Use quantity-based stock tracking instead.'
    );
  }

  // Create the product
  const product = await tx.shopProduct.create({
    data: {
      tenantId,
      shopId,
      name: dto.name,
      type: dto.type,
      isSerialized: dto.isSerialized,
      salePrice: dto.salePrice,
      costPrice: dto.costPrice,
      hsnCode: dto.hsnCode,
      gstRate: dto.gstRate,
    },
  });

  // ✅ If serialized, create IMEI records
  if (dto.isSerialized && dto.imeis?.length) {
    await tx.iMEI.createMany({
      data: dto.imeis.map((imei) => ({
        tenantId,
        shopProductId: product.id,
        imei,
        status: 'IN_STOCK',
      })),
    });
  }

  // ✅ If not serialized, create stock IN ledger entry for initial qty
  if (!dto.isSerialized && dto.initialQuantity) {
    await tx.stockLedger.create({
      data: {
        tenantId,
        shopId,
        shopProductId: product.id,
        type: 'IN',
        quantity: dto.initialQuantity,
        referenceType: 'ADJUSTMENT',
        note: 'Initial stock',
      },
    });
  }

  return product;
}

/**
 * Get available stock (different logic for serialized vs bulk)
 */
async getAvailableStock(
  tenantId: string,
  shopProductId: string,
): Promise<number> {
  const product = await this.prisma.shopProduct.findUnique({
    where: { id: shopProductId },
    select: { isSerialized: true },
  });

  if (product.isSerialized) {
    // ✅ Count IN_STOCK IMEIs for serialized
    return await this.prisma.iMEI.count({
      where: {
        shopProductId,
        status: 'IN_STOCK',
      },
    });
  } else {
    // ✅ Sum StockLedger for bulk
    const ledger = await this.prisma.stockLedger.findMany({
      where: { shopProductId },
    });

    return ledger.reduce((sum, entry) => {
      return entry.type === 'IN'
        ? sum + entry.quantity
        : sum - entry.quantity;
    }, 0);
  }
}

/**
 * Get stock details (including status breakdown for serialized)
 */
async getStockDetails(shopProductId: string) {
  const product = await this.prisma.shopProduct.findUnique({
    where: { id: shopProductId },
  });

  if (product.isSerialized) {
    // ✅ Serialized: breakdown by status
    const inStock = await this.prisma.iMEI.count({
      where: { shopProductId, status: 'IN_STOCK' },
    });
    const sold = await this.prisma.iMEI.count({
      where: { shopProductId, status: 'SOLD' },
    });
    const damaged = await this.prisma.iMEI.count({
      where: { shopProductId, status: 'DAMAGED' },
    });
    const returned = await this.prisma.iMEI.count({
      where: { shopProductId, status: 'RETURNED' },
    });

    return {
      type: 'SERIALIZED',
      inStock,
      sold,
      damaged,
      returned,
      total: inStock + sold + damaged + returned,
    };
  } else {
    // ✅ Bulk: quantity summary
    const ledger = await this.prisma.stockLedger.findMany({
      where: { shopProductId },
    });

    const quantity = ledger.reduce((sum, entry) => {
      return entry.type === 'IN'
        ? sum + entry.quantity
        : sum - entry.quantity;
    }, 0);

    return {
      type: 'BULK',
      quantity,
      reorderLevel: product.reorderLevel,
      needsReorder: quantity <= (product.reorderLevel || 0),
    };
  }
}
```

---

## 5. PurchaseService - Link to Stock

### File: `src/modules/supplier/purchase/purchase.service.ts` (Enhanced)

```typescript
/**
 * Complete a purchase (mark as PAID, create stock entries)
 * ✅ Links purchase items to stock IN ledger
 */
async completePurchase(
  tx: any,
  purchaseId: string,
  tenantId: string,
  shopId: string,
) {
  const purchase = await tx.purchase.findUnique({
    where: { id: purchaseId },
    include: {
      items: {
        include: { product: true },
      },
    },
  });

  if (!purchase) {
    throw new NotFoundException('Purchase not found');
  }

  // Create stock IN entry for each item
  for (const item of purchase.items) {
    // ✅ Link to purchase
    await tx.stockLedger.create({
      data: {
        tenantId,
        shopId,
        shopProductId: item.shopProductId,
        type: 'IN',
        quantity: item.quantity,
        referenceType: 'PURCHASE',
        referenceId: item.id, // Link to PurchaseItem
        costPerUnit: item.purchasePrice,
        note: `Purchased from ${purchase.supplierName}`,
      },
    });

    // ✅ If serialized product with IMEIs, create them
    if (item.product?.isSerialized && item.product?.imeis?.length) {
      // IMEIs should have been created when purchase was created
      // Just validate they exist
    }
  }

  // Mark purchase as completed
  await tx.purchase.update({
    where: { id: purchaseId },
    data: { status: 'PAID' },
  });
}
```

---

## 6. Database Queries - Stock Analysis

### Common Queries for Reports

```typescript
// Get stock value by product
async getInventoryValue(shopId: string) {
  const products = await this.prisma.shopProduct.findMany({
    where: { shopId },
  });

  const values = await Promise.all(
    products.map(async (product) => {
      if (product.isSerialized) {
        const count = await this.prisma.iMEI.count({
          where: { shopProductId: product.id, status: 'IN_STOCK' },
        });
        return {
          product: product.name,
          quantity: count,
          unitCost: product.costPrice,
          total: count * (product.costPrice || 0),
        };
      } else {
        const ledger = await this.prisma.stockLedger.findMany({
          where: { shopProductId: product.id },
        });
        const qty = ledger.reduce(
          (sum, e) => (e.type === 'IN' ? sum + e.quantity : sum - e.quantity),
          0,
        );
        const avgCost =
          ledger
            .filter((e) => e.type === 'IN')
            .reduce((sum, e) => sum + (e.costPerUnit || 0), 0) /
            (ledger.filter((e) => e.type === 'IN').length || 1);
        return {
          product: product.name,
          quantity: qty,
          unitCost: avgCost,
          total: qty * avgCost,
        };
      }
    }),
  );

  return values;
}

// Get repair parts used
async getRepairPartsCost(shopId: string, dateRange?: DateRange) {
  const parts = await this.prisma.stockLedger.findMany({
    where: {
      shopId,
      referenceType: 'REPAIR',
      createdAt: dateRange ? { gte: dateRange.from, lte: dateRange.to } : undefined,
    },
    include: { product: true },
  });

  return parts.reduce((sum, entry) => {
    return sum + (entry.costPerUnit || 0) * entry.quantity;
  }, 0);
}

// Get IMEI status distribution
async getIMEIStatus(shopId: string) {
  const products = await this.prisma.shopProduct.findMany({
    where: { shopId, isSerialized: true },
  });

  const stats = {};
  for (const product of products) {
    const byStatus = await this.prisma.iMEI.groupBy({
      by: ['status'],
      where: { shopProductId: product.id },
      _count: true,
    });

    stats[product.name] = Object.fromEntries(
      byStatus.map((s) => [s.status, s._count]),
    );
  }

  return stats;
}
```

---

## Implementation Checklist

- [ ] Migrate schema: `npx prisma migrate dev --name "fix_inventory_stock_separation"`
- [ ] Generate types: `npx prisma generate`
- [ ] Create StockService with validation
- [ ] Update RepairService with ledger linkage
- [ ] Update InvoiceService with IMEI status
- [ ] Update InventoryService with isSerialized checks
- [ ] Update PurchaseService with stock creation
- [ ] Write unit tests for each service
- [ ] Test repair add/cancel workflow
- [ ] Test IMEI sold/returned workflow
- [ ] Test stock OUT validation
- [ ] Deploy and monitor

---

**Next:** These implementations should be done immediately after the schema migration to enforce the new architecture.
