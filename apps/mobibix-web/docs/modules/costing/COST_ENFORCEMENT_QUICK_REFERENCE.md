# COST ENFORCEMENT - QUICK REFERENCE

**Status:** ✅ IMPLEMENTED  
**Date:** 2026-02-01  
**Backend Files Modified:** 2  
**Lines Changed:** ~45  
**Schema Changes:** 0

---

## WHAT WAS FIXED

### Problem

- Sales could occur without cost price, making profit = NULL or = revenue only
- Stock corrections could create "poison inventory" without cost data

### Solution

- **FIX 1:** Reject sales if product has no valid cost (sales.service.ts)
- **FIX 2:** Enforce cost on stock corrections (stock.service.ts)
- **FIX 3:** Reports already correct, no changes needed

---

## FILES CHANGED

### 1. src/core/sales/sales.service.ts (Line 168-178)

**Change:** Cost map now preserves NULL, with validation block

**Before:**

```typescript
const productCostMap = new Map(products.map((p) => [p.id, p.costPrice || 0]));
```

**After:**

```typescript
const productCostMap = new Map(
  products.map((p) => [p.id, p.costPrice ?? null]),
);

// 🛡️ FIX 1: ENFORCE COST VALIDATION BEFORE SALE
for (const item of dto.items) {
  const cost = productCostMap.get(item.shopProductId);
  if (cost === null || cost === undefined || cost <= 0) {
    const product = products.find((p) => p.id === item.shopProductId);
    throw new BadRequestException(
      `Cannot sell product "${product?.name || "Unknown"}" without a valid cost price. ` +
        `Please ensure a purchase has been recorded or update the cost price manually.`,
    );
  }
}
```

### 2. src/core/stock/stock.service.ts (Line 146-178)

**Change:** Added cost validation for ADJUSTMENT entries in recordStockIn()

**New code block (inserted after IMEI validation, before stockLedger.create):**

```typescript
// 🛡️ FIX 2: COST DISCIPLINE FOR ADJUSTMENTS
if (referenceType === "ADJUSTMENT") {
  let effectiveCost = costPerUnit;

  if (!effectiveCost || effectiveCost <= 0) {
    const shopProduct = await prisma.shopProduct.findUnique({
      where: { id: productId },
      select: { costPrice: true },
    });
    effectiveCost = shopProduct?.costPrice || null;
  }

  if (!effectiveCost || effectiveCost <= 0) {
    throw new BadRequestException(
      `Stock correction requires a valid cost price for product "${product.name}". ` +
        `Please ensure the product has a cost price from a prior purchase.`,
    );
  }

  costPerUnit = effectiveCost;
}
```

---

## TESTING

### Quick Test 1: Sale Without Cost

```
POST /mobileshop/sales
{
  "shopId": "shop123",
  "items": [{
    "shopProductId": "product-no-cost",
    "quantity": 1,
    "rate": 100
  }]
}

Expected: ❌ 400 BadRequestException
Message: "Cannot sell product 'Widget' without a valid cost price..."
```

### Quick Test 2: Sale With Cost

```
1. Create/purchase product → costPrice = 50
2. POST /mobileshop/sales with same product
3. Expected: ✅ 201 Invoice created
   StockLedger OUT entry has costPerUnit = 50
```

### Quick Test 3: Stock Correction Without Cost

```
POST /mobileshop/stock/correct
{
  "shopId": "shop123",
  "shopProductId": "product-no-cost",
  "quantity": 5,
  "reason": "PHYSICAL_COUNT"
}

Expected: ❌ 400 BadRequestException
Message: "Stock correction requires a valid cost price..."
```

### Quick Test 4: Stock Correction With Cost

```
1. Create product with costPrice = 75
2. POST /mobileshop/stock/correct
3. Expected: ✅ 200 Correction created
   StockLedger IN entry has costPerUnit = 75
```

---

## ROLLOUT PLAN

1. ✅ Code changes implemented
2. ✅ No schema migration needed
3. ✅ Backwards compatible
4. Deploy to production
5. Monitor for validation errors
6. Expected: Some users may need to update product costs

---

## KEY BEHAVIOR CHANGES

### Before Fix

- Could sell product without purchase → profit = NULL or revenue
- Could correct stock without cost → lost inventory cost data

### After Fix

- Cannot sell without cost → must purchase first ✅
- Cannot correct stock without cost → maintains inventory integrity ✅
- All future sales have trustworthy profit ✅
- Historical data preserved (no backfill) ✅

---

## ERROR MESSAGES

### FIX 1 (Sales)

```
Cannot sell product 'PRODUCT_NAME' without a valid cost price.
Please ensure a purchase has been recorded or update the cost price manually.
```

### FIX 2 (Stock Corrections)

```
Stock correction requires a valid cost price for product 'PRODUCT_NAME'.
Please ensure the product has a cost price from a prior purchase.
```

---

## IMPACT SUMMARY

✅ **Positive Impacts:**

- Profit now trustworthy for all new sales
- No poison inventory from corrections
- Clear error messages guide users
- No data loss or backfill needed

⚠️ **Expected Side Effects:**

- Sales may fail if product not purchased → guide user to purchase first
- Stock corrections may fail → guide user to set cost first
- Old sales may show NULL profit → honest audit trail

✅ **NOT affected:**

- Existing data unchanged
- Reports still work
- No migration needed
- Full backwards compatibility

---

## DEPLOYMENT COMMANDS

```bash
# 1. Verify no syntax errors
npm run build

# 2. Run backend tests (if any)
npm run test

# 3. Deploy to staging
git push staging main

# 4. Deploy to production
git push production main

# 5. Monitor for validation errors
tail -f logs/mobibix-backend.log | grep "Cannot sell"
```

---

**Cost enforcement implemented. Profit is now trustworthy.**
