# PHASE 3: BACKWARD COMPATIBILITY RULES

**Date**: February 1, 2026  
**Status**: Design Only (NO Implementation Yet)  
**Objective**: Ensure existing data remains valid and profitable after WAC introduction

---

## PRINCIPLE: OLD DATA REMAINS UNCHANGED

**Golden Rule**:

- Historical invoices will NOT be recalculated
- Old profit figures remain static
- Migration is purely forward-looking
- Existing ShopProduct records are safe

---

## 3A: EXISTING SHOPPRODUCT HANDLING

### Scenario: Product already exists with costPrice = ₹50

**Before Migration**:

```
ShopProduct:
  name: "iPhone 15"
  costPrice: 50
  salePrice: 100
  // No avgCost field
```

**After Migration** (Day 1):

```
ShopProduct:
  name: "iPhone 15"
  costPrice: 50
  avgCost: 50           ← Set equal to costPrice
  totalStockValue: ???  ← Calculate from StockLedger (see below)
  coatingMethod: 'LPP'  ← Mark as legacy
```

**How to Calculate totalStockValue**?

```
SELECT
  SUM(CASE
    WHEN type='IN' THEN quantity
    ELSE -quantity
  END) AS currentQty
FROM StockLedger
WHERE shopProductId = 'product-id';

totalStockValue = currentQty × avgCost
```

**Example**:

```
StockLedger entries for iPhone 15:
  IN:  qty=20 @ ₹50 (cost=50)
  IN:  qty=10 @ ₹60 (cost=60)
  OUT: qty=15 (cost=50)
  OUT: qty=10 (cost=60)

Current Stock: 20 + 10 - 15 - 10 = 5 units

Option A (Simple):
  avgCost = costPrice = 50
  totalStockValue = 5 × 50 = ₹250

Option B (Accurate - Preferred):
  Calculate true weighted average from IN entries:
  avgCost = (20×50 + 10×60) / 30 = 1600/30 = 53.33
  totalStockValue = 5 × 53.33 = ₹266.65
```

**Recommendation**: Use Option B (accurate retroactive calculation)

---

## 3B: EXISTING INVOICES (SALES)

### Scenario: Invoice created before WAC migration

**Invoice Created**: Jan 15 (before WAC)

```
InvoiceItem:
  id: "invItem-123"
  shopProductId: "iphone-15"
  quantity: 10
  rate: 100
  lineTotal: 1000
  costPerUnit: NULL  ← Not stored (legacy)
```

**StockLedger Entry** (created at sale time):

```
StockLedger:
  id: "ledger-456"
  shopProductId: "iphone-15"
  type: OUT
  quantity: 10
  costPerUnit: 50  ← Recorded at sale time (LPP)
  referenceType: SALE
  referenceId: "invItem-123"
```

### Profit Calculation for Old Invoice

**Option 1: Use StockLedger** (Current Approach)

```typescript
const cost = await db.stockLedger.findFirst({
  where: {
    referenceType: "SALE",
    referenceId: "invItem-123",
  },
  select: { costPerUnit: true },
});
const profit = 1000 - cost * 10; // 1000 - 500 = 500
```

**Option 2: Use InvoiceItem** (New Approach - Deferred)

```typescript
// After migration, populate historical costPerUnit
await db.invoiceItem.update({
  where: { id: "invItem-123" },
  data: { costPerUnit: 50 }, // From StockLedger
});

const profit = 1000 - 50 * 10; // Same result
```

**Decision**: Use Option 2

- Populate costPerUnit in InvoiceItem from StockLedger
- One-time batch migration (backward compatible)
- Future reports use InvoiceItem (immutable)

### Migration Query

```sql
-- Populate costPerUnit for old invoices
UPDATE InvoiceItem ii
SET costPerUnit = sl.costPerUnit
FROM StockLedger sl
WHERE sl.referenceType = 'SALE'
  AND sl.referenceId = ii.id
  AND ii.costPerUnit IS NULL;
```

**Result**: All old invoices now have costPerUnit = their original sale cost (LPP)

---

## 3C: NEW INVOICES (AFTER MIGRATION)

### Scenario: Invoice created after WAC is active

**Step 1: New StockLedger Entry**

```
StockLedger (old record):
  type: IN
  quantity: 10
  costPerUnit: 70  ← Recorded with batch

StockLedger (new record - WAC active):
  type: IN
  quantity: 5
  costPerUnit: 80
```

**Step 2: Product Now Has avgCost**

```
ShopProduct (after WAC calc):
  avgCost: 76  ← (10×70 + 5×80) / 15 = 1300/15
  totalStockValue: 1140  ← 15 × 76
```

**Step 3: New Invoice Created**

```
InvoiceItem:
  id: "invItem-789"
  shopProductId: "iphone-15"
  quantity: 5
  rate: 100
  lineTotal: 500
  costPerUnit: 76  ← NEW: Uses avgCost!
```

**Step 4: StockLedger OUT Entry**

```
StockLedger:
  type: OUT
  quantity: 5
  costPerUnit: 76  ← Uses avgCost (not batch cost)
  referenceType: SALE
  referenceId: "invItem-789"
```

**Profit Calculation**:

```
Revenue: 500
Cost: 76 × 5 = 380
Profit: 120 ✅ Accurate
```

---

## 3D: COST CALCULATION HIERARCHY

```
GET COST FOR SALE:
  1. Check InvoiceItem.costPerUnit (if already exists)
       ✓ Use it (immutable)
  2. Check ShopProduct.avgCost (if avgCost method)
       ✓ Use it (new WAC)
  3. Check ShopProduct.costPrice (legacy fallback)
       ⚠ Use it with warning
  4. Fallback: NULL
       ✗ Reject sale
```

### Code Example

```typescript
async getCostForInvoiceLine(
  invoiceItemId: string,
  productId: string,
): Promise<number> {
  // Check InvoiceItem first
  const item = await db.invoiceItem.findUnique({
    where: { id: invoiceItemId },
    select: { costPerUnit: true },
  });

  if (item?.costPerUnit) {
    return item.costPerUnit;  // ✅ Use recorded cost
  }

  // Fetch product for fallback
  const product = await db.shopProduct.findUnique({
    where: { id: productId },
    select: { avgCost: true, costPrice: true, coatingMethod: true },
  });

  // Check avgCost
  if (product.coatingMethod === 'WAC' && product.avgCost) {
    return product.avgCost;  // ✅ Use WAC
  }

  // Fallback to costPrice
  if (product.costPrice) {
    logger.warn(`Using legacy costPrice for ${productId}`);
    return product.costPrice;  // ⚠ Fallback
  }

  // No cost available
  throw new Error(`Product ${productId} has no cost`);
}
```

---

## 3E: DATA MIGRATION STRATEGY

### Phase 1: Add Fields (No Data Changes)

```sql
ALTER TABLE ShopProduct ADD COLUMN avgCost DECIMAL(10,2) DEFAULT NULL;
ALTER TABLE ShopProduct ADD COLUMN totalStockValue DECIMAL(15,2) DEFAULT NULL;
ALTER TABLE ShopProduct ADD COLUMN coatingMethod VARCHAR(10) DEFAULT 'LPP';
ALTER TABLE InvoiceItem ADD COLUMN costPerUnit INT DEFAULT NULL;
```

### Phase 2: Populate Historical Data (One-Time)

```sql
-- For each existing product, calculate avgCost from StockLedger
UPDATE ShopProduct sp
SET avgCost = (
  SELECT AVG(CASE WHEN type='IN' THEN costPerUnit END)
    FILTER (WHERE type='IN')
  FROM StockLedger
  WHERE shopProductId = sp.id
),
totalStockValue = (
  SELECT (
    SUM(CASE
      WHEN type='IN' THEN quantity
      ELSE -quantity
    END) * AVG(CASE WHEN type='IN' THEN costPerUnit END)
      FILTER (WHERE type='IN')
  )
  FROM StockLedger
  WHERE shopProductId = sp.id
),
coatingMethod = 'LPP'
WHERE costPrice IS NOT NULL;

-- Populate InvoiceItem.costPerUnit from StockLedger
UPDATE InvoiceItem ii
SET costPerUnit = sl.costPerUnit
FROM StockLedger sl
WHERE sl.referenceType = 'SALE'
  AND sl.referenceId = ii.id
  AND ii.costPerUnit IS NULL;
```

### Phase 3: Deploy (Production)

```
1. Deploy code changes (no logic changes yet, just new fields)
2. Run migration scripts
3. Verify data integrity
4. Activate WAC logic in code
5. New sales use avgCost
6. Old sales unchanged
```

---

## 3F: VERIFICATION QUERIES

### Verify Migration Completeness

```sql
-- Check: All products have avgCost
SELECT COUNT(*) as products_without_avgcost
FROM ShopProduct
WHERE costPrice IS NOT NULL
  AND avgCost IS NULL;
-- Expected: 0

-- Check: All pre-migration invoices have costPerUnit
SELECT COUNT(*) as invoices_without_cost
FROM InvoiceItem ii
WHERE NOT EXISTS (
  SELECT 1 FROM StockLedger
  WHERE referenceId = ii.id AND referenceType = 'SALE'
)
AND ii.costPerUnit IS NULL;
-- Expected: 0

-- Check: avgCost is reasonable
SELECT
  name,
  costPrice,
  avgCost,
  CASE
    WHEN avgCost IS NULL THEN 'NULL'
    WHEN ABS(avgCost - costPrice) / costPrice > 0.1 THEN '>10% diff'
    ELSE 'OK'
  END as status
FROM ShopProduct
WHERE costPrice IS NOT NULL;
-- Review: Large differences indicate mixed-cost inventory
```

---

## 3G: TESTING SCENARIOS

### Scenario 1: Old Invoice (Pre-WAC)

**Setup**:

- Invoice created Jan 1 (before WAC)
- costPerUnit = NULL (legacy)
- StockLedger cost = ₹50

**Test**:

```
1. Run profit report
2. Expected: Uses StockLedger cost (50)
3. Profit: 1000 - 500 = 500 ✅
4. After migration: Uses InvoiceItem.costPerUnit (50)
5. Profit: Still 500 ✅ (unchanged)
```

### Scenario 2: New Invoice (Post-WAC)

**Setup**:

- Stock added: 10 @ ₹50, 10 @ ₹70
- avgCost calculated: ₹60
- New invoice created

**Test**:

```
1. InvoiceItem created with costPerUnit = 60
2. Profit: 1000 - 600 = 400
3. Compare to LPP: 1000 - 700 = 300
4. WAC is more accurate (300 → 400, ₹100 difference)
```

### Scenario 3: Mixed Batches

**Setup**:

- Old product: costPrice = ₹50
- After migration: avgCost = ₹50, coatingMethod = 'LPP'
- User adds stock @ ₹80
- avgCost recalculated: ₹65

**Test**:

```
1. coatingMethod still 'LPP' until next sale
2. Sale uses avgCost = 65 ✅
3. coatingMethod = 'WAC' (updated after first WAC sale)
4. No retroactive changes to old profits
```

---

## 3H: EDGE CASES

### Case 1: Product Never Sold (Stock Only)

**Scenario**:

- Product has 100 units in stock
- Never sold (no OUT entries)
- costPrice = 50

**Before Migration**:

```
ShopProduct: costPrice = 50
StockLedger: All IN entries
Report: No sales, no profit impact
```

**After Migration**:

```
ShopProduct:
  avgCost = 50 (from IN entries)
  totalStockValue = 5000
Report: Still no sales, no impact
```

**Action**: No change needed. Product is ready for WAC sales.

### Case 2: Product with NULL costPrice

**Scenario**:

- Old product, no cost ever set
- costPrice = NULL
- Stock exists (added without cost validation)

**Before Migration**:

```
ShopProduct: costPrice = NULL
Cannot create sales (validation fails)
```

**After Migration**:

```
ShopProduct: avgCost = NULL (no IN cost to calc from)
Cannot create sales (validation still fails)
Action: Admin must set cost manually
```

**Action**: Audit and fix before WAC activation.

### Case 3: Negative Stock (Corrections)

**Scenario**:

- Stock OUT > Stock IN (system allowed it)
- currentQty = -5 units

**Before Migration**:

```
totalStockValue = ??? (negative value)
```

**After Migration**:

```
IF currentQty < 0:
  avgCost = NULL (no meaningful average)
  totalStockValue = NULL
Action: Audit and correct stock first
```

---

## 3I: ROLLBACK PLAN

**If WAC causes issues**:

### Option 1: Revert to LPP

```typescript
// In sales.service.ts, revert logic:
const cost = product.costPrice;  // Back to LPP

// Revert coatingMethod:
UPDATE ShopProduct
SET coatingMethod = 'LPP'
WHERE coatingMethod = 'WAC';

// New invoices created during WAC period:
// - Still have costPerUnit (immutable)
// - Reports use InvoiceItem.costPerUnit (correct)
// - No data loss, just revert to old calculation for future
```

### Option 2: Selective Disable

```typescript
// For specific products:
UPDATE ShopProduct
SET coatingMethod = 'LPP'
WHERE id IN ('problematic-product-1', 'problematic-product-2');

// Sales for these products revert to costPrice
// Other products continue using avgCost
```

**Rollback Cost**: Zero

- No data modification needed
- Just revert logic switch
- Historical invoices unchanged
- costPerUnit values remain (correct record)

---

## 3J: AUDIT & COMPLIANCE

### Logging Requirements

```typescript
// Log every avgCost change
logger.info("avgCost_recalculated", {
  productId: "prod-123",
  oldAvgCost: 50,
  newAvgCost: 60,
  method: "WAC",
  trigger: "stock_in",
  timestamp: new Date(),
  userId: context.userId, // Who triggered?
});

// Log every coatingMethod change
logger.info("coatingMethod_changed", {
  productId: "prod-123",
  from: "LPP",
  to: "WAC",
  trigger: "first_wac_sale",
  timestamp: new Date(),
});

// Log profit variance
logger.info("profit_variance", {
  invoiceId: "inv-123",
  lppProfit: 450,
  wacProfit: 600,
  variance: 150,
  method: "WAC",
});
```

### Audit Trail

```sql
-- Query profit changes
SELECT
  ii.id,
  ii.costPerUnit,
  sl.costPerUnit as recorded_cost,
  CASE
    WHEN ii.costPerUnit IS NULL THEN 'LPP'
    WHEN ii.costPerUnit = sl.costPerUnit THEN 'WAC'
    ELSE 'Mismatch'
  END as method
FROM InvoiceItem ii
LEFT JOIN StockLedger sl ON sl.referenceId = ii.id
WHERE sl.referenceType = 'SALE'
ORDER BY ii.createdAt;
```

---

## 3K: SUMMARY TABLE

| Aspect                      | Before WAC                   | After WAC                        | Impact           |
| --------------------------- | ---------------------------- | -------------------------------- | ---------------- |
| **costPrice**               | Used for all sales           | Only for LPP legacy              | Backward compat  |
| **avgCost**                 | N/A                          | Calculated & updated             | Accurate for WAC |
| **InvoiceItem.costPerUnit** | NULL                         | Populated                        | Immutable record |
| **Old invoices**            | Profit = Revenue - costPrice | Profit = Revenue - recorded cost | UNCHANGED        |
| **New invoices**            | N/A                          | Profit = Revenue - avgCost       | MORE ACCURATE    |
| **StockLedger**             | Unchanged                    | Unchanged                        | SAFE             |
| **Reports**                 | Read StockLedger             | Prefer InvoiceItem               | SAME PROFIT      |

---

## PHASE 3 COMPLETE

✅ **Backward Compatibility Strategy Designed**

**Key Guarantees**:

1. Old profit figures frozen (no recalculation)
2. Old invoices use recorded cost (InvoiceItem.costPerUnit)
3. New invoices use avgCost (more accurate)
4. Graceful fallback (avgCost → costPrice if needed)
5. Rollback possible with zero data loss
6. Full audit trail maintained

**Next**: PHASE 4 - Reports (no changes needed)
