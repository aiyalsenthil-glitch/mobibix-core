# PHASE 2: WEIGHTED AVERAGE COST DESIGN

**Date**: February 1, 2026  
**Status**: Design Only (NO Implementation Yet)  
**Objective**: Design safe, incremental WAC mechanism

---

## OVERVIEW: What is Weighted Average Cost?

**Formula**:

```
avgCost(new) = (oldQty × oldAvgCost + inQty × inCost) / (oldQty + inQty)
```

**Example**:

```
Initial: 0 units @ ₹0 (avgCost = N/A)
  ↓
Purchase 10 @ ₹50:
  avgCost = (0 × 0 + 10 × 50) / 10 = ₹50
  ↓
Purchase 10 @ ₹70:
  avgCost = (10 × 50 + 10 × 70) / 20 = (500 + 700) / 20 = ₹60
  ↓
Sell 15 @ ₹100:
  Cost = 15 × 60 = ₹900
  Revenue = 15 × 100 = ₹1,500
  Profit = ₹600 ✅ (Much better than LPP's ₹450)
```

---

## PHASE 2A: DATABASE SCHEMA CHANGES

### New Fields to Add to ShopProduct

```prisma
model ShopProduct {
  // ... existing fields ...
  costPrice        Int?           // Keep for backward compat (legacy LPP)

  // NEW FIELDS FOR WAC
  avgCost          Decimal?       // Weighted average cost per unit
  totalStockValue  Decimal?       // Total cost of all units in hand (for calc)
  // Formula: avgCost = totalStockValue / (stockQty from StockLedger sum)

  coatingMethod    String         // Track which method: "LPP" | "WAC"
  updatedAt        DateTime       @updatedAt // Track last cost update
}
```

### New Field to Add to InvoiceItem

```prisma
model InvoiceItem {
  // ... existing fields ...
  costPerUnit      Int?           // ✅ NEW: Cost at time of sale (immutable)
  // This makes profit immutable and auditable
}
```

### Migration Plan

```sql
-- Add avgCost field
ALTER TABLE ShopProduct ADD COLUMN avgCost DECIMAL(10,2) NULL;

-- Add totalStockValue field
ALTER TABLE ShopProduct ADD COLUMN totalStockValue DECIMAL(15,2) NULL;

-- Add coatingMethod field
ALTER TABLE ShopProduct ADD COLUMN coatingMethod VARCHAR(10) DEFAULT 'LPP';

-- Add costPerUnit to InvoiceItem
ALTER TABLE InvoiceItem ADD COLUMN costPerUnit INT NULL;

-- Populate avgCost = costPrice for existing products
UPDATE ShopProduct SET avgCost = costPrice WHERE costPrice IS NOT NULL;

-- Populate totalStockValue (needs calculation from StockLedger)
-- This is done in code during migration script
```

---

## PHASE 2B: ALGORITHM - Weighted Average Calculation

### When Stock IN Happens

**Trigger**: `StockInSingleProduct()` called

**Algorithm**:

```
1. Get current ShopProduct state:
   - currentQty = sum of all IN - sum of all OUT from StockLedger
   - currentAvgCost = ShopProduct.avgCost (or NULL if new)
   - currentValue = ShopProduct.totalStockValue (or NULL if new)

2. Get incoming batch:
   - inQty = dto.quantity
   - inCost = dto.costPerUnit

3. Calculate new average:
   IF currentQty <= 0:
     newAvgCost = inCost
     newValue = inQty × inCost
   ELSE:
     newValue = currentValue + (inQty × inCost)
     newAvgCost = newValue / (currentQty + inQty)

4. Update ShopProduct:
   - avgCost = newAvgCost
   - totalStockValue = newValue
   - coatingMethod = 'WAC'

5. Create StockLedger entry:
   - type = IN
   - costPerUnit = inCost (preserve actual batch cost)
   - quantity = inQty
```

### Code Pseudocode

```typescript
async stockInSingleProduct(tenantId: string, dto: StockInDto) {
  return this.prisma.$transaction(async (tx) => {
    // 1. Fetch current product state
    const product = await tx.shopProduct.findFirst({
      where: { id: dto.productId, tenantId, isActive: true },
      select: {
        id: true,
        shopId: true,
        avgCost: true,
        totalStockValue: true,
      },
    });

    // 2. Calculate current quantity from StockLedger
    const ledgerEntries = await tx.stockLedger.findMany({
      where: { shopProductId: product.id, tenantId },
      select: { type: true, quantity: true },
    });

    const currentQty = ledgerEntries.reduce((sum, e) => {
      return e.type === 'IN' ? sum + e.quantity : sum - e.quantity;
    }, 0);

    // 3. Calculate new weighted average
    const inQty = dto.quantity;
    const inCost = dto.costPerUnit;
    const oldValue = product.totalStockValue || 0;
    const oldAvgCost = product.avgCost || inCost;

    let newAvgCost: number;
    let newValue: number;

    if (currentQty <= 0) {
      newAvgCost = inCost;
      newValue = inQty * inCost;
    } else {
      newValue = oldValue + (inQty * inCost);
      newAvgCost = newValue / (currentQty + inQty);
    }

    // 4. Create StockLedger entry (preserves batch cost)
    await tx.stockLedger.create({
      data: {
        tenantId,
        shopId: product.shopId,
        shopProductId: product.id,
        type: 'IN',
        quantity: inQty,
        costPerUnit: inCost,  // ← Preserve ACTUAL batch cost
        referenceType: 'PURCHASE',
        referenceId: null,
      },
    });

    // 5. Update ShopProduct with new weighted average
    await tx.shopProduct.update({
      where: { id: product.id },
      data: {
        avgCost: newAvgCost,           // ← NEW average
        totalStockValue: newValue,     // ← NEW total value
        coatingMethod: 'WAC',          // ← Mark as WAC
      },
    });

    return { newAvgCost, newValue, currentQty, inQty, inCost };
  });
}
```

---

## PHASE 2C: ALGORITHM - Sales with WAC

### When Sale Happens

**Trigger**: `createInvoice()` called

**Algorithm**:

```
1. Fetch product avgCost (not costPrice):
   - Read ShopProduct.avgCost
   - IF NULL or coatingMethod='LPP':
     - Fallback to costPrice (backward compat)
     - Log WARNING in audit

2. For each sale line item:
   - lineCost = avgCost × quantity
   - Create InvoiceItem with costPerUnit = avgCost

3. When recording StockOut:
   - Use avgCost (not costPrice)
   - Create StockLedger(type=OUT, costPerUnit=avgCost)

4. Profit calculation (unchanged):
   - Reports query StockLedger OUT entries
   - Get costPerUnit recorded at sale time
   - Calculate profit = revenue - cost
```

### Code Changes to Sales Service

**File**: `apps/backend/src/core/sales/sales.service.ts`

**Current (LPP)**:

```typescript
const productCostMap = new Map(
  products.map((p) => [p.id, p.costPrice ?? null]), // ← Latest cost
);
```

**New (WAC)**:

```typescript
// Fetch avgCost instead of costPrice
const products = await tx.shopProduct.findMany({
  where: {
    id: { in: productIds },
    tenantId,
    shopId: dto.shopId,
    isActive: true,
  },
  select: {
    id: true,
    name: true,
    isSerialized: true,
    hsnCode: true,
    avgCost: true, // ← NEW
    costPrice: true, // ← Keep for fallback
    coatingMethod: true, // ← NEW (track method)
  },
});

// Build cost map using avgCost with fallback to costPrice
const productCostMap = new Map(
  products.map((p) => {
    let cost = null;
    if (p.coatingMethod === "WAC" && p.avgCost) {
      cost = p.avgCost; // ← Use WAC
    } else if (p.costPrice) {
      cost = p.costPrice; // ← Fallback to LPP
      // Log warning: "Product using LPP, consider WAC"
    }
    return [p.id, cost];
  }),
);
```

### InvoiceItem Creation Update

**Current**:

```typescript
const invoiceItemsData = calc.lines.map((line) => ({
  shopProductId: line.shopProductId,
  quantity: line.quantity,
  rate: this.toInt(line.rate),
  hsnCode: line.hsnCode,
  gstRate: line.gstRate,
  gstAmount: this.toPaisa(line.gstAmount),
  lineTotal: this.toPaisa(line.lineTotal),
  // ❌ No cost stored
}));
```

**New**:

```typescript
const invoiceItemsData = calc.lines.map((line) => ({
  shopProductId: line.shopProductId,
  quantity: line.quantity,
  rate: this.toInt(line.rate),
  hsnCode: line.hsnCode,
  gstRate: line.gstRate,
  gstAmount: this.toPaisa(line.gstAmount),
  lineTotal: this.toPaisa(line.lineTotal),
  costPerUnit: productCostMap.get(line.shopProductId), // ✅ NEW
}));
```

---

## PHASE 2D: Stock OUT Handling

### Current (LPP)

```typescript
await this.stockService.recordStockOut(
  tenantId,
  dto.shopId,
  item.shopProductId,
  item.quantity,
  "SALE",
  invoiceItem.id,
  productCostMap.get(item.shopProductId), // ← Latest costPrice
  item.imeis,
);
```

### New (WAC)

**No change to recordStockOut signature!**

- It already receives cost as parameter
- Same code works for both LPP and WAC
- Just passing different cost value (avgCost vs costPrice)

```typescript
// Same call, different cost source
await this.stockService.recordStockOut(
  tenantId,
  dto.shopId,
  item.shopProductId,
  item.quantity,
  "SALE",
  invoiceItem.id,
  productCostMap.get(item.shopProductId), // ← Now uses avgCost!
  item.imeis,
);
```

---

## PHASE 2E: Stock Correction Handling

### Stock Corrections (Adjustments)

**Current**: StockCorrection creates a StockLedger OUT entry with cost=NULL

**With WAC**: Should use avgCost to maintain accuracy

```typescript
async recordStockCorrection(
  tenantId: string,
  shopId: string,
  productId: string,
  correctionQty: number,  // Can be positive (add) or negative (remove)
  reason: string,
) {
  const product = await this.prisma.shopProduct.findFirst({
    where: { id: productId, tenantId },
    select: { avgCost: true, costPrice: true },
  });

  // Use avgCost for correction
  const cost = product.avgCost || product.costPrice || 0;

  await this.prisma.stockLedger.create({
    data: {
      tenantId,
      shopId,
      shopProductId: productId,
      type: correctionQty > 0 ? 'IN' : 'OUT',
      quantity: Math.abs(correctionQty),
      costPerUnit: cost,  // ← Use avgCost
      referenceType: 'ADJUSTMENT',
    },
  });
}
```

---

## PHASE 2F: Report Changes (MINIMAL)

### Current Report Query

```typescript
const costs = await this.prisma.stockLedger.findMany({
  where: {
    tenantId,
    referenceType: "SALE",
    referenceId: { in: allItemIds },
  },
  select: { referenceId: true, costPerUnit: true },
});
```

### New Approach (Optional, Better)

Use InvoiceItem.costPerUnit instead of StockLedger:

```typescript
// NEW: Directly fetch from InvoiceItem
const costs = await this.prisma.invoiceItem.findMany({
  where: { id: { in: allItemIds } },
  select: { id: true, costPerUnit: true },
});

const costMap = new Map(costs.map((c) => [c.id, c.costPerUnit]));
```

**Advantage**:

- Immutable: cost is recorded at sale time
- One source of truth: no need to query StockLedger
- Audit trail: can see exact cost used for profit

**Backward Compatibility**:

- For old invoices (costPerUnit = NULL):
  - Fall back to StockLedger query
  - Or recalculate with current avgCost (with warning)

---

## PHASE 2G: Backward Compatibility Map

```
OLD SYSTEM (LPP)          →  NEW SYSTEM (WAC)
─────────────────────────────────────────────
costPrice (latest)        →  avgCost (calculated)
No cost in InvoiceItem    →  costPerUnit in InvoiceItem
No coatingMethod          →  coatingMethod='WAC'
No totalStockValue        →  totalStockValue (calculated)

DATA MIGRATION RULE:
For all existing ShopProducts:
  - avgCost = costPrice (assume it was the first batch)
  - totalStockValue = costPrice × currentStockQty
  - coatingMethod = 'LPP' (legacy)

SALES CONVERSION:
For old invoices:
  - costPerUnit = NULL (not stored)
  - Reports must query StockLedger (as before)
  - Profit is correct (same as LPP)

NEW INVOICES:
  - costPerUnit = recorded avgCost
  - Reports use InvoiceItem.costPerUnit
  - Profit is accurate (WAC)
```

---

## PHASE 2H: Fallback Logic

### If avgCost is NULL

```typescript
function getCostForSale(product: ShopProduct): number {
  // Priority: avgCost > costPrice > 0
  if (product.avgCost && product.avgCost > 0) {
    return product.avgCost; // ✅ Primary: WAC
  }

  if (product.costPrice && product.costPrice > 0) {
    logger.warn(
      `Product ${product.id} using legacy costPrice. ` +
        `Consider running WAC migration.`,
    );
    return product.costPrice; // ⚠️ Fallback: LPP
  }

  // No cost available (should be prevented by validation)
  throw new Error(`Product ${product.id} has no cost set`);
}
```

---

## PHASE 2I: Validation Rules

### Before Stock IN

```typescript
if (!dto.costPerUnit || dto.costPerUnit <= 0) {
  throw new BadRequestException("Cost must be > 0");
}
```

### Before Sale

```typescript
if (!product.avgCost || product.avgCost <= 0) {
  if (!product.costPrice || product.costPrice <= 0) {
    throw new BadRequestException(
      `Product has no valid cost. Add stock to set cost.`,
    );
  }
}
```

---

## PHASE 2J: Metrics to Track

### avgCost Changes

```typescript
// Log every avgCost recalculation
logger.info("WAC Recalculated", {
  productId: product.id,
  oldAvgCost: oldAvgCost,
  newAvgCost: newAvgCost,
  change: (((newAvgCost - oldAvgCost) / oldAvgCost) * 100).toFixed(2) + "%",
  reason: "Stock IN",
  batch: { qty: inQty, cost: inCost },
});
```

### Profit Variance

```typescript
// Track difference between LPP and WAC
const lppProfit = revenue - costPrice * qty;
const wacProfit = revenue - avgCost * qty;
const variance = wacProfit - lppProfit;

if (Math.abs(variance) > 100) {
  // > ₹1 variance
  logger.warn("Profit variance due to WAC", {
    invoiceId: invoice.id,
    lppProfit,
    wacProfit,
    variance,
  });
}
```

---

## PHASE 2K: Implementation Safety Checklist

- [ ] Add 3 new fields to ShopProduct (avgCost, totalStockValue, coatingMethod)
- [ ] Add 1 new field to InvoiceItem (costPerUnit)
- [ ] Migration: Populate avgCost = costPrice for existing products
- [ ] Update StockInSingleProduct() with WAC calculation
- [ ] Update createInvoice() to use avgCost
- [ ] Update createInvoiceItem() to store costPerUnit
- [ ] Update recordStockOut() calls (no signature change)
- [ ] Update stock corrections to use avgCost
- [ ] Add fallback: avgCost → costPrice if NULL
- [ ] Update reports to prefer InvoiceItem.costPerUnit
- [ ] Add logging for WAC recalculation
- [ ] Test backward compatibility (old invoices still work)
- [ ] Document coatingMethod field for audits

---

## PHASE 2 SUMMARY

**Design Complete**: Weighted Average Cost implementation is safe and incremental

**Key Points**:

1. ✅ **No breaking changes** - all fields are optional
2. ✅ **Backward compatible** - old data continues to work
3. ✅ **Immutable costs** - recorded at sale time in InvoiceItem
4. ✅ **Historical accuracy** - StockLedger unchanged
5. ✅ **Audit trail** - coatingMethod tracks which method was used
6. ✅ **Fallback logic** - avgCost → costPrice gracefully

**Next**: PHASE 3 - Backward Compatibility Rules
