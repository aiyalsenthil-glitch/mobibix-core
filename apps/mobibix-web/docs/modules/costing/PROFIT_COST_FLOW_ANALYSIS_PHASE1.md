# PROFIT COST FLOW ANALYSIS - PHASE 1 (ANALYSIS ONLY)

**Project:** MobiBix – Web ERP  
**Issue:** Profit shown in Reports UI is incorrect (Stock cost not reducing from profit)  
**Status:** PHASE 1 - ANALYSIS COMPLETE  
**Date:** 2026-02-01

---

## 1. STOCKLEDGER SCHEMA & FIELD ANALYSIS

### Location

`prisma/schema.prisma` (lines 816-839)

### Model Definition

```prisma
model StockLedger {
  id            String         @id @default(cuid())
  tenantId      String
  shopId        String
  shopProductId String
  type          StockEntryType      // IN | OUT | SALE | ADJUSTMENT
  quantity      Int
  referenceType StockRefType?       // PURCHASE | SALE | REPAIR | ADJUSTMENT
  referenceId   String?              // Points to PurchaseItem.id or InvoiceItem.id
  costPerUnit   Int?                 // ⚠️ NULLABLE - THIS IS THE PROBLEM
  note          String?
  createdAt     DateTime       @default(now())
  shop          Shop           @relation(fields: [shopId], references: [id])
  product       ShopProduct    @relation(fields: [shopProductId], references: [id])
  tenant        Tenant         @relation("TenantStockEntries", fields: [tenantId], references: [id])

  @@index([tenantId, shopId, createdAt])
  @@index([shopProductId, createdAt])
  @@index([tenantId, shopId, type])
  @@index([referenceType, referenceId])
}
```

### Critical Field Analysis

| Field           | Type                    | Status         | Issue                                         |
| --------------- | ----------------------- | -------------- | --------------------------------------------- |
| `type`          | StockEntryType (IN/OUT) | ✅ Implemented | Correctly distinguishes IN vs OUT             |
| `quantity`      | Int                     | ✅ Implemented | Correctly stored                              |
| `costPerUnit`   | Int? (NULLABLE)         | ⚠️ PROBLEM     | Allows NULL - cost can be missing             |
| `referenceType` | StockRefType?           | ✅ Implemented | Tracks PURCHASE/SALE/REPAIR                   |
| `referenceId`   | String?                 | ✅ Implemented | Links to source (PurchaseItem or InvoiceItem) |

---

## 2. PURCHASE FLOW ANALYSIS

### 2.1 Purchase Creation Path

**File:** `src/core/purchases/purchases.service.ts` (lines 53-135)

#### Step 1: Create Purchase Invoice

```typescript
// PurchasesService.create()
const purchase = await tx.purchase.create({
  data: {
    tenantId,
    shopId: dto.shopId,
    supplierName: dto.supplierName,
    invoiceNumber: dto.invoiceNumber,
    items: { create: itemsData },
    // ... other fields
  },
});
```

**Item structure in itemsData:**

```typescript
{
  shopProductId: item.shopProductId,
  description: item.description,
  quantity: item.quantity,
  purchasePrice: item.purchasePrice,  // ✅ IN PAISA
  gstRate: item.gstRate || 0,
  taxAmount: ...,
  totalAmount: ...,
}
```

#### Step 2: Record Stock IN

**Code location:** `purchases.service.ts` (lines 127-139)

```typescript
// Loop through items after purchase created
for (const item of purchase.items) {
  await this.stockService.recordStockIn(
    tenantId,
    dto.shopId,
    item.shopProductId!,
    item.quantity,
    "PURCHASE",
    purchase.id, // Reference: Purchase ID
    item.purchasePrice, // ✅ costPerUnit = purchase price (PAISA)
    undefined, // imeis
    tx,
  );

  // Also update ShopProduct.costPrice (Last Purchase Price)
  if (item.shopProductId) {
    await tx.shopProduct.update({
      where: { id: item.shopProductId },
      data: { costPrice: item.purchasePrice },
    });
  }
}
```

### 2.2 StockService.recordStockIn() Implementation

**File:** `src/core/stock/stock.service.ts` (lines 177-226)

```typescript
async recordStockIn(
  tenantId: string,
  shopId: string,
  productId: string,
  quantity: number,
  referenceType: 'PURCHASE' | 'SALE' | 'REPAIR' | 'ADJUSTMENT',
  referenceId: string | null,
  costPerUnit?: number,          // ✅ PARAMETER EXISTS
  imeis?: string[],
  tx?: any,
) {
  // ... validation ...

  return prisma.stockLedger.create({
    data: {
      tenantId,
      shopId,
      shopProductId: productId,
      type: 'IN',
      quantity,
      referenceType,
      referenceId,
      costPerUnit,                 // ✅ STORED HERE
    },
  });
}
```

### 2.3 Purchase Flow Verification

| Step                    | Status         | costPerUnit Value    | Notes                             |
| ----------------------- | -------------- | -------------------- | --------------------------------- |
| 1. Purchase created     | ✅             | N/A                  | Purchase item has `purchasePrice` |
| 2. StockLedger IN entry | ✅             | `item.purchasePrice` | Correctly passed to recordStockIn |
| 3. ShopProduct updated  | ✅             | `item.purchasePrice` | LPP strategy applied              |
| **Result**              | ✅ **WORKING** | **Populated**        | **COST IS CAPTURED AT PURCHASE**  |

---

## 3. SALES FLOW ANALYSIS

### 3.1 Invoice Creation Path

**File:** `src/core/sales/sales.service.ts` (lines 139-432)

#### Step 1: Load Product Costs

**Code location:** lines 158-167

```typescript
// Before creating invoice, fetch products with costPrice
const products = await tx.shopProduct.findMany({
  where: {
    id: { in: productIds },
    tenantId,
    shopId: dto.shopId,
    isActive: true,
  },
  select: { id: true, isSerialized: true, hsnCode: true, costPrice: true },
});

// Build cost map (LPP - Last Purchase Price from ShopProduct)
const productCostMap = new Map(products.map((p) => [p.id, p.costPrice || 0]));
```

**⚠️ CRITICAL:** Cost comes from `ShopProduct.costPrice` (updated during purchase)

#### Step 2: Create Invoice

**Code location:** lines 290-332

```typescript
const invoice = await tx.invoice.create({
  data: {
    tenantId,
    shopId: dto.shopId,
    customerId: dto.customerId,
    invoiceNumber,
    // ... invoice fields ...
    items: { create: invoiceItemsDataCorrected },
  },
});
```

**InvoiceItem structure:**

```typescript
{
  shopProductId: item.shopProductId,
  quantity: item.quantity,
  rate: item.rate,                // Sale price per unit (PAISA)
  gstRate: item.gstRate,
  gstAmount: ...,
  lineTotal: (rate * quantity) + gstAmount,  // Total with GST
}
```

#### Step 3: Record Stock OUT

**Code location:** lines 390-410

```typescript
// After invoice created, create stock OUT entries
for (let i = 0; i < dto.items.length; i++) {
  const item = dto.items[i];
  const invoiceItem = createdInvoice.items[i];
  const isSerialized = productSerializedMap.get(item.shopProductId);

  await this.stockService.recordStockOut(
    tenantId,
    dto.shopId,
    item.shopProductId,
    item.quantity,
    "SALE",
    invoiceItem.id, // Reference: InvoiceItem ID
    productCostMap.get(item.shopProductId), // ✅ costPerUnit = LPP (PAISA)
    isSerialized ? item.imeis : undefined,
    tx,
  );
}
```

### 3.2 StockService.recordStockOut() Implementation

**File:** `src/core/stock/stock.service.ts` (lines 119-175)

```typescript
async recordStockOut(
  tenantId: string,
  shopId: string,
  productId: string,
  quantity: number,
  referenceType: 'PURCHASE' | 'SALE' | 'REPAIR' | 'ADJUSTMENT',
  referenceId: string | null,
  costPerUnit?: number,           // ✅ PARAMETER EXISTS
  imeis?: string[],
  tx?: any,
) {
  const prisma = tx || this.prisma;

  // Validate sufficient stock
  const currentStock = await this.getCurrentStock(productId, tenantId);
  if (currentStock < quantity) {
    throw new BadRequestException(
      `Insufficient stock for product. ` +
        `Current: ${currentStock}, Requested: ${quantity}`,
    );
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
      costPerUnit,                 // ✅ STORED HERE
    },
  });
}
```

### 3.3 Sales Flow Verification

| Step                     | Status         | costPerUnit Value         | Notes                              |
| ------------------------ | -------------- | ------------------------- | ---------------------------------- |
| 1. Fetch product costs   | ✅             | `ShopProduct.costPrice`   | From LPP                           |
| 2. Create invoice        | ✅             | N/A                       | Invoice only stores sale prices    |
| 3. StockLedger OUT entry | ✅             | `productCostMap.get(...)` | Correctly passed to recordStockOut |
| **Result**               | ✅ **WORKING** | **Populated**             | **COST IS CAPTURED AT SALE TIME**  |

---

## 4. REPORTS/PROFIT QUERY ANALYSIS

### 4.1 Sales Report Profit Calculation

**File:** `src/modules/mobileshop/reports/reports.service.ts` (lines 96-191)

```typescript
async getSalesReport(
  tenantId: string,
  startDate?: Date,
  endDate?: Date,
  shopId?: string,
  partyId?: string,
) {
  // 1. Fetch all invoices
  const invoices = await this.prisma.invoice.findMany({
    where: {
      tenantId,
      ...(shopId && { shopId }),
      status: { not: InvoiceStatus.CANCELLED },
    },
    include: {
      items: true,
      receipts: { where: { status: ReceiptStatus.ACTIVE } },
      customer: { select: { name: true } },
    },
  });

  // 2. Fetch cost data from StockLedger
  const allItemIds = invoices.flatMap(inv => inv.items.map(i => i.id));

  let costMap = new Map<string, number | null>();
  if (allItemIds.length > 0) {
    const costs = await this.prisma.stockLedger.findMany({
      where: {
        tenantId,
        referenceType: 'SALE',          // ✅ Query SALE entries
        referenceId: { in: allItemIds },  // ✅ Match InvoiceItem.id
      },
      select: { referenceId: true, costPerUnit: true },
    });
    costs.forEach(c => costMap.set(c.referenceId!, c.costPerUnit));
  }

  // 3. Calculate profit per invoice
  return invoices.map((inv) => {
    let totalProfit: number | null = 0;
    let isProfitValid = true;

    for (const item of inv.items) {
      const cost = costMap.get(item.id);

      // ⚠️ CRITICAL LOGIC: If any cost is NULL/UNDEFINED, entire profit = NULL
      if (cost === undefined || cost === null) {
        isProfitValid = false;
        break;
      }

      // Profit formula:
      // NetRevenue = lineTotal - gstAmount
      // TotalCost = costPerUnit * quantity
      // Profit = NetRevenue - TotalCost
      totalProfit! += (item.lineTotal - item.gstAmount) - (cost * item.quantity);
    }

    if (!isProfitValid) totalProfit = null;

    return {
      invoiceNo: inv.invoiceNumber,
      totalAmount: inv.totalAmount / 100,    // Paisa to Rupees
      profit: totalProfit !== null ? totalProfit / 100 : null,  // Paisa to Rupees
      // ... other fields ...
    };
  });
}
```

### 4.2 Profit Calculation Formula

```
For each InvoiceItem:
  cost = StockLedger[referenceType='SALE', referenceId=item.id].costPerUnit

  If cost === NULL or UNDEFINED:
    invoice.profit = NULL  ❌ ENTIRE INVOICE PROFIT BECOMES NULL

  Otherwise:
    netRevenue = item.lineTotal - item.gstAmount  (in PAISA)
    itemCost = cost * item.quantity               (in PAISA)
    itemProfit = netRevenue - itemCost

totalProfit = SUM(itemProfit for all items)
profit (Rupees) = totalProfit / 100
```

### 4.3 Query Analysis - Does It Work?

✅ **THE QUERY IS CORRECT** if StockLedger SALE entries have costPerUnit populated.

The query logic:

1. ✅ Correctly filters for `referenceType = 'SALE'`
2. ✅ Correctly matches `referenceId` to `InvoiceItem.id`
3. ✅ Retrieves `costPerUnit` from matching rows
4. ✅ Applies correct profit formula: Revenue - Cost

**HOWEVER:** The query assumes StockLedger.costPerUnit is **NOT NULL** for SALE entries.

---

## 5. DATA VERIFICATION (SQL LEVEL)

### 5.1 Check 1: NULL costPerUnit in SALE entries

```sql
-- Find SALE entries with NULL costPerUnit
SELECT
  id,
  shopProductId,
  type,
  quantity,
  costPerUnit,
  referenceType,
  referenceId,
  createdAt
FROM "StockLedger"
WHERE "type" = 'OUT'
  AND "referenceType" = 'SALE'
  AND "costPerUnit" IS NULL
ORDER BY "createdAt" DESC
LIMIT 20;

-- Expected: EMPTY (all costs should be populated)
-- If NOT EMPTY: This is the ROOT CAUSE
```

### 5.2 Check 2: Verify IN entries have costs

```sql
-- Verify PURCHASE IN entries have costPerUnit
SELECT
  id,
  type,
  quantity,
  costPerUnit,
  referenceType,
  referenceId,
  createdAt
FROM "StockLedger"
WHERE "type" = 'IN'
  AND "referenceType" = 'PURCHASE'
  AND "costPerUnit" IS NULL
ORDER BY "createdAt" DESC
LIMIT 20;

-- Expected: EMPTY
-- If NOT EMPTY: Costs lost during purchase
```

### 5.3 Check 3: Cross-verify Purchase → StockLedger IN → StockLedger OUT chain

```sql
-- For a specific invoice, trace the cost flow:
WITH sale_items AS (
  SELECT
    i.id as item_id,
    i."invoiceId",
    i."shopProductId",
    i.quantity as sale_qty,
    sl."costPerUnit" as sale_cost
  FROM "InvoiceItem" i
  LEFT JOIN "StockLedger" sl
    ON sl."referenceId" = i.id
    AND sl."referenceType" = 'SALE'
    AND sl.type = 'OUT'
  WHERE i."invoiceId" = 'YOUR_INVOICE_ID'
)
SELECT
  item_id,
  sale_qty,
  sale_cost,
  CASE WHEN sale_cost IS NULL THEN 'MISSING COST' ELSE 'OK' END as status
FROM sale_items;

-- Expected: All rows show sale_cost populated
-- If ANY row has NULL: Profit calculation will fail for that invoice
```

### 5.4 Check 4: Verify costPrice → costPerUnit flow

```sql
-- Did ShopProduct.costPrice get updated during purchase?
SELECT
  id,
  name,
  costPrice,
  updated_at
FROM "ShopProduct"
WHERE "costPrice" IS NULL OR "costPrice" = 0
ORDER BY "updatedAt" DESC
LIMIT 10;

-- Expected: costPrice populated for products with stock IN
-- If many are NULL: Indicates purchase cost capture failed
```

### 5.5 Check 5: Ledger-item mismatch check

```sql
-- Do we have SALE InvoiceItems WITHOUT matching StockLedger SALE entries?
SELECT
  i.id as item_id,
  i."invoiceId",
  i."shopProductId",
  i.quantity,
  COUNT(sl.id) as stock_out_entries
FROM "InvoiceItem" i
LEFT JOIN "StockLedger" sl
  ON sl."referenceId" = i.id
  AND sl."referenceType" = 'SALE'
  AND sl.type = 'OUT'
GROUP BY i.id, i."invoiceId", i."shopProductId", i.quantity
HAVING COUNT(sl.id) = 0
ORDER BY i."invoiceId" DESC
LIMIT 20;

-- Expected: EMPTY (all items should have matching stock out)
-- If NOT EMPTY: StockLedger entries never created for these sales
```

---

## 6. ROOT CAUSE HYPOTHESIS MATRIX

### Scenario A: costPerUnit IS Populated on SALE ✅

**Status:** Working as designed

- Purchase captures cost ✅
- Sale captures cost ✅
- Reports query finds cost ✅
- **Action:** Run Check 1 to verify

### Scenario B: costPerUnit IS NULL on SALE ❌

**Status:** Bug in SalesService.createInvoice()

- **Root cause:** `productCostMap.get()` returns NULL/undefined
  - ShopProduct.costPrice was never set (purchase failed)
  - OR productCostMap lookup failed (product not found)
- **Impact:** profit = NULL for affected invoices
- **Evidence needed:** Check 1 & 4

### Scenario C: StockLedger SALE entries not created ❌

**Status:** Bug in SalesService.createInvoice() stock OUT logic

- **Root cause:** `recordStockOut()` call skipped/failed
- **Impact:** No SALE entries exist; reports query finds no rows; profit = NULL
- **Evidence needed:** Check 5

### Scenario D: Mixed (Historical + Current) ⚠️

**Status:** Likely - some old invoices missing cost, new ones OK

- **Root cause:** Service code was updated recently
- **Impact:** Some profit NULL, some populated
- **Evidence needed:** Date-based analysis in Check 1

---

## 7. CRITICAL FINDINGS

### Finding 1: Code Structure is CORRECT ✅

- **Purchase → StockLedger IN:** costPerUnit parameter passed correctly
- **Sale → StockLedger OUT:** costPerUnit parameter passed correctly
- **Reports Query:** Correctly filters SALE entries and calculates profit

### Finding 2: NULL costPerUnit CAN Exist (schema allows it) ⚠️

- StockLedger.costPerUnit is nullable (`Int?`)
- No database constraint forces it to be populated
- Reports safely handle NULL (returns `profit = null`)

### Finding 3: Two Weak Points in Cost Flow

**Weak Point 1: ShopProduct.costPrice lookup**

```typescript
// Location: sales.service.ts line 164
const productCostMap = new Map(products.map((p) => [p.id, p.costPrice || 0]));
// If costPrice is NULL, defaults to 0 - profit appears as FULL REVENUE
```

**Weak Point 2: No explicit check for cost existence**

```typescript
// Location: sales.service.ts line 407
await this.stockService.recordStockOut(
  ...,
  productCostMap.get(item.shopProductId), // Could be 0 if costPrice was NULL
  ...,
);
// If cost = 0, then profit = revenue (completely wrong for profit calculation)
```

### Finding 4: Reports Profit Becomes NULL (Conservative but Masked) ✅

- If StockLedger.costPerUnit is NULL, reports return `profit = null`
- This is **correct behavior** but **masks the root cause**
- User sees null instead of understanding "cost wasn't captured"

---

## 8. SUMMARY TABLE

| Component         | Location               | Status           | Risk       | Evidence                         |
| ----------------- | ---------------------- | ---------------- | ---------- | -------------------------------- |
| **Purchase IN**   | purchases.service.ts   | ✅ Correct       | Low        | costPerUnit passed correctly     |
| **Sale OUT**      | sales.service.ts       | ✅ Code Correct  | **MEDIUM** | Depends on productCostMap ≠ NULL |
| **StockLedger**   | schema + queries       | ✅ Schema OK     | **MEDIUM** | Allows NULL costPerUnit          |
| **Cost Map**      | sales.service.ts:164   | ⚠️ Weak          | **HIGH**   | Defaults to 0 if NULL            |
| **Reports Query** | reports.service.ts     | ✅ Logic Correct | Low        | Correctly filters & calculates   |
| **Profit Logic**  | reports.service.ts:166 | ✅ Formula OK    | Low        | Correct revenue - cost formula   |

---

## 9. PHASE 1 CONCLUSION

### What We Know ✅

1. **Code structure is sound** - purchase and sale services correctly pass costPerUnit
2. **Reports query is correct** - properly retrieves costs and calculates profit
3. **Schema allows costs** - StockLedger.costPerUnit field exists and is passed

### What We Don't Know (Need Data Verification) ❌

1. **Are SALE entries actually getting costPerUnit populated?** → Run Check 1
2. **Did ShopProduct.costPrice get set from purchases?** → Run Check 4
3. **Are StockLedger OUT entries being created for sales?** → Run Check 5
4. **Is profit NULL or showing as REVENUE only?** → Run Check 1 + sample reports

### Most Likely Root Cause (Before Data Verification)

**Scenario B/D Hybrid:**

- Some/all ShopProduct.costPrice entries are NULL or 0
- When SalesService.createInvoice() runs, `productCostMap.get()` returns NULL/0
- StockLedger.costPerUnit stored as NULL/0
- Reports show `profit = null` (if NULL) or profit = revenue (if 0)

### Next Step

**PHASE 2:** Execute SQL checks to locate exact data issue, then propose minimal fixes.

---

## APPENDIX: Cost Flow Diagram (Current Code)

```
PURCHASE FLOW:
─────────────────────────────────────────────────
PurchaseItem.purchasePrice
    ↓
PurchasesService.create()
    ↓ (pass item.purchasePrice)
StockService.recordStockIn()
    ↓
StockLedger.create({
  type: 'IN',
  costPerUnit: item.purchasePrice  ✅
})
    ↓
ShopProduct.update({
  costPrice: item.purchasePrice  ✅
})


SALES FLOW:
─────────────────────────────────────────────────
ShopProduct.costPrice (set from last purchase)
    ↓ (load at line 164)
productCostMap = Map<productId, costPrice>
    ↓ (if costPrice = NULL, defaults to 0) ⚠️
SalesService.createInvoice()
    ↓ (pass productCostMap.get(productId))
StockService.recordStockOut()
    ↓
StockLedger.create({
  type: 'OUT',
  referenceType: 'SALE',
  referenceId: InvoiceItem.id,
  costPerUnit: productCostMap.get(...) ⚠️ Could be NULL or 0
})


REPORTS PROFIT CALCULATION:
─────────────────────────────────────────────────
StockLedger.findMany({
  referenceType: 'SALE',
  referenceId: InvoiceItem.id
}) → costPerUnit
    ↓ (if NULL: profit = NULL; if 0: profit = revenue)
For each item:
  profit += (lineTotal - gstAmount) - (costPerUnit × qty)
    ↓
Reports.profit = total profit / 100
```

---

**END OF PHASE 1 ANALYSIS**

Cost flow analysis complete. Awaiting approval to implement fixes.
