# PHASE 1: SYSTEM ANALYSIS – Current Costing Architecture ✅

**Date**: February 1, 2026  
**Role**: Senior ERP Inventory & Accounting Architect  
**Objective**: Analyze current Last Purchase Price (LPP) implementation before upgrading to Weighted Average Cost (WAC)

---

## 1. STOCKLEDGER STRUCTURE ANALYSIS

### Model: StockLedger

**Location**: `prisma/schema.prisma` (line 816)

```prisma
model StockLedger {
  id            String         @id @default(cuid())
  tenantId      String
  shopId        String
  shopProductId String
  type          StockEntryType  // IN | OUT
  quantity      Int
  referenceType StockRefType?   // PURCHASE | SALE | REPAIR | ADJUSTMENT
  referenceId   String?         // Link to Invoice or other record
  costPerUnit   Int?            // ✅ CRUCIAL: Cost per batch in paisa
  note          String?
  createdAt     DateTime        @default(now())

  // Indexes for performance
  @@index([tenantId, shopId, createdAt])
  @@index([shopProductId, createdAt])
  @@index([tenantId, shopId, type])
  @@index([referenceType, referenceId])
}
```

### Key Findings:

✅ **StockLedger correctly tracks EACH batch with its cost**

- Entry 1 (Purchase): qty=10, costPerUnit=50
- Entry 2 (Purchase): qty=10, costPerUnit=70
- Both entries preserved with different costs

✅ **costPerUnit is stored per entry** (not per product)

- Allows granular cost tracking
- Enables future FIFO/LIFO implementation

✅ **referenceType = 'SALE' links output to invoice**

- When stock goes OUT, referenceId points to InvoiceItem.id
- Allows cost reconstruction from StockLedger

### Limitation:

⚠️ **costPerUnit is OPTIONAL (Int?)**

- Some legacy records may have NULL cost
- System allows creation without cost (mitigated by later validations)

---

## 2. SHOPPRODUCT STRUCTURE ANALYSIS

### Model: ShopProduct

**Location**: `prisma/schema.prisma` (line 753)

```prisma
model ShopProduct {
  id               String     @id @default(cuid())
  tenantId         String
  shopId           String
  name             String
  salePrice        Int?       // Retail price
  costPrice        Int?       // ⚠️ LATEST PURCHASE PRICE ONLY
  type             ProductType
  category         String?
  isActive         Boolean    @default(true)
  createdAt        DateTime   @default(now())
  updatedAt        DateTime   @updatedAt

  // Relations
  stockEntries     StockLedger[]
  invoiceItems     InvoiceItem[]
  // ... other fields
}
```

### Key Findings:

✅ **costPrice exists and is maintained**

- Updated whenever new stock is added
- Validates cost > 0 before sales

⚠️ **costPrice is SINGULAR field**

- Only stores LATEST cost
- When you add 10 @ ₹50, then 10 @ ₹70, costPrice becomes 70
- No historical cost tracking at product level

❌ **NO avgCost field yet**

- Not available for Weighted Average Cost calculation
- Will need to be added in PHASE 2

**Current Strategy**: Last Purchase Price (LPP)

- Always uses the most recent costPrice
- Simple but inaccurate for volatile costs

---

## 3. SALES FLOW ANALYSIS

### Where Cost is Read

**File**: `apps/backend/src/core/sales/sales.service.ts` (line 165)

```typescript
// Line 160-177: Fetch products with cost
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
    costPrice: true, // ← LATEST COST FETCHED HERE
  },
});

// Map cost to product ID
const productCostMap = new Map(
  products.map((p) => [p.id, p.costPrice ?? null]),
);
```

### Cost Validation

**File**: `sales.service.ts` (line 187-195)

```typescript
// 🛡️ ENFORCE COST VALIDATION
for (const item of dto.items) {
  const cost = productCostMap.get(item.shopProductId);
  if (cost === null || cost === undefined || cost <= 0) {
    throw new BadRequestException(
      `Cannot sell product "${product?.name}" without valid cost price`,
    );
  }
}
```

**Finding**: ✅ Cost is validated before sale (no missing/zero costs allowed)

### Where Cost is Stored in Invoice

**File**: `sales.service.ts` (line 272)

```typescript
const invoiceItemsDataCorrected = calc.lines.map((line) => ({
  shopProductId: line.shopProductId,
  quantity: line.quantity,
  rate: this.toInt(line.rate),
  hsnCode: line.hsnCode,
  gstRate: line.gstRate,
  gstAmount: this.toPaisa(line.gstAmount),
  lineTotal: this.toPaisa(line.lineTotal),
  // ❌ NO costPerUnit stored in InvoiceItem!
}));
```

**Finding**: ❌ **Cost NOT stored in InvoiceItem**

- InvoiceItem model has NO costPerUnit field
- Cost is only stored in ShopProduct.costPrice (latest only)
- Profit calculation must fetch cost from ShopProduct after sale

---

## 4. INVOICEITEM STRUCTURE ANALYSIS

### Model: InvoiceItem

**Location**: `prisma/schema.prisma` (line 894)

```prisma
model InvoiceItem {
  id            String      @id @default(cuid())
  invoiceId     String
  shopProductId String
  quantity      Int
  rate          Int         // Selling price
  hsnCode       String
  gstRate       Float
  gstAmount     Int
  lineTotal     Int
  // ❌ NO costPerUnit field!
  // ❌ NO profitPerUnit field!
  invoice       Invoice     @relation(fields: [invoiceId], references: [id])
  product       ShopProduct @relation(fields: [shopProductId], references: [id])
}
```

### Key Finding:

❌ **InvoiceItem does NOT store costPerUnit**

- This is a CRITICAL GAP for accurate profit tracking
- Cost is fetched from StockLedger at report time (see below)
- Profit is recalculated dynamically from ShopProduct.costPrice

**Implication**: If costPrice changes AFTER sale, profit is recalculated retroactively!

---

## 5. PROFIT CALCULATION ANALYSIS

### Where Profit is Calculated

**File**: `apps/backend/src/modules/mobileshop/reports/reports.service.ts` (line 85-200)

```typescript
// STEP 1: Fetch invoices with items
const invoices = await this.prisma.invoice.findMany({
  where: { tenantId, ... },
  include: {
    items: true,  // ← InvoiceItem records (NO cost)
    receipts: { ... },
    customer: { ... },
    shop: { ... },
  },
});

// STEP 2: Fetch costs from StockLedger
const allItemIds = invoices.flatMap(inv => inv.items.map(i => i.id));
let costMap = new Map<string, number | null>();

const costs = await this.prisma.stockLedger.findMany({
  where: {
    tenantId,
    referenceType: 'SALE',          // ← Only SALE entries
    referenceId: { in: allItemIds }, // ← Match to InvoiceItem.id
  },
  select: { referenceId: true, costPerUnit: true },
});
costs.forEach(c => costMap.set(c.referenceId!, c.costPerUnit));

// STEP 3: Calculate profit for each invoice
return invoices.map((inv) => {
  let totalProfit: number | null = 0;
  let isProfitValid = true;

  for (const item of inv.items) {
    const cost = costMap.get(item.id);  // ← Fetch from StockLedger
    if (cost === undefined || cost === null) {
      isProfitValid = false;
      break;
    }
    // Profit = (Net Revenue - Total Cost)
    totalProfit! += (item.lineTotal - item.gstAmount) - (cost * item.quantity);
  }

  if (!isProfitValid) totalProfit = null;

  return {
    invoiceNo: inv.invoiceNumber,
    totalAmount: inv.totalAmount / 100,
    profit: totalProfit !== null ? totalProfit / 100 : null,
    // ...
  };
});
```

### Key Finding:

⚠️ **Profit depends on StockLedger.costPerUnit**

- Reports fetch cost from StockLedger (not InvoiceItem or ShopProduct)
- This is GOOD because StockLedger tracks historical cost per batch
- But: How does StockLedger.costPerUnit get set?

### CRITICAL DISCOVERY: Cost Recording Flow

**When stock goes OUT (sale), how is cost recorded?**

Let me trace the stock OUT flow:

**File**: `sales.service.ts` (around line 420-440)

```typescript
// When invoice is created:
for (let i = 0; i < dto.items.length; i++) {
  const item = dto.items[i];

  // Record stock OUT with cost
  await this.stockService.recordStockOut(
    tenantId,
    dto.shopId,
    item.shopProductId,
    item.quantity,
    "SALE",
    invoiceItem.id, // ← This is the referenceId
    productCostMap.get(item.shopProductId), // ← Cost passed
    item.imeis,
  );
}
```

**Finding**: ✅ When stock goes OUT, cost IS captured

- `productCostMap.get(item.shopProductId)` returns **current ShopProduct.costPrice**
- This cost is passed to `recordStockOut()`
- It's stored as StockLedger entry with type='OUT'

**Problem**:

- For mixed batches (10 @ ₹50, 10 @ ₹70, sell 15):
- System uses latest cost (₹70) for ALL 15 units
- Actual cost varies: 10 @ ₹50 + 5 @ ₹70 = ₹850
- System records: 15 @ ₹70 = ₹1,050
- **Profit understated by ₹200**

---

## 6. COST FLOW SUMMARY

```
┌─────────────────────────────────────────────────────────┐
│              CURRENT COST FLOW (LPP)                    │
└─────────────────────────────────────────────────────────┘

INVENTORY (Stock In):
  StockInSingleProduct()
    ├─ Receive: costPerUnit = ₹50
    ├─ Create StockLedger(type=IN, costPerUnit=50, qty=10)
    └─ Update ShopProduct.costPrice = 50 ✅

  [Later] Add more stock
  StockInSingleProduct()
    ├─ Receive: costPerUnit = ₹70
    ├─ Create StockLedger(type=IN, costPerUnit=70, qty=10)
    └─ Update ShopProduct.costPrice = 70  ← OVERWRITES!

  Current state:
    ├─ ShopProduct.costPrice = 70 (latest)
    ├─ ShopProduct.stockQty = 20 (total)
    └─ StockLedger has 2 IN entries (cost preserved) ✅

─────────────────────────────────────────────────────────

SALES (Stock Out):
  CreateInvoice()
    ├─ Fetch ShopProduct.costPrice = 70
    ├─ Fetch ShopProduct for all items
    ├─ Build productCostMap: {itemId → 70}
    ├─ For each sale item, call recordStockOut(cost=70)
    └─ Create StockLedger(type=OUT, costPerUnit=70, qty=15)
        └─ referenceId = InvoiceItem.id ✅

  Problem: Uses current cost (70), not batch cost (50 or mix)

─────────────────────────────────────────────────────────

REPORTS:
  GetSalesReport()
    ├─ Fetch invoices + items
    ├─ Query StockLedger(type=SALE, referenceId=itemId)
    ├─ Get costPerUnit = 70 (recorded at sale time)
    ├─ Calculate profit = (revenue - 70*qty)
    └─ ⚠️ May be inaccurate if mixed costs
```

---

## 7. DATA INTEGRITY CHECK

### Question: Is Historical Data Safe?

✅ **Yes. All data is preserved correctly.**

```
Scenario: Add stock @ 50, then @ 70, then sell 15
─────────────────────────────────────────────────

StockLedger:
  Entry 1: [IN, shopProd-123, qty=10, cost=50, date=Jan1]
  Entry 2: [IN, shopProd-123, qty=10, cost=70, date=Jan2]
  Entry 3: [OUT, shopProd-123, qty=15, cost=70, date=Jan3, refId=invItem-1]

ShopProduct (shopProd-123):
  costPrice: 70 (latest)
  stockQty: 5 (10+10-15)

InvoiceItem (invItem-1):
  quantity: 15
  [NO cost field]

Reports will calculate:
  Revenue: 15 * 100 = 1500
  Cost: StockLedger.costPerUnit (70) = 1050
  Profit: 450

Real cost if FIFO:
  Revenue: 1500
  Cost: 10*50 + 5*70 = 500 + 350 = 850
  Profit: 650

Difference: -200 (15% understatement)
```

---

## 8. CRITICAL FINDINGS SUMMARY

| Aspect                      | Current                        | Status        | Impact                         |
| --------------------------- | ------------------------------ | ------------- | ------------------------------ |
| **StockLedger**             | Tracks each batch with cost    | ✅ Good       | Enables future FIFO/LIFO       |
| **ShopProduct.costPrice**   | Latest purchase price only     | ⚠️ Limited    | Used for validation only       |
| **ShopProduct.avgCost**     | Does NOT exist                 | ❌ Missing    | Needed for WAC                 |
| **InvoiceItem.costPerUnit** | Does NOT exist                 | ❌ Missing    | Should store cost at sale time |
| **Profit Calculation**      | Uses StockLedger.costPerUnit   | ⚠️ Dynamic    | Recalculated from latest cost  |
| **Cost Accuracy**           | Last Purchase Price only       | ❌ Inaccurate | Fails with volatile costs      |
| **Historical Data**         | Fully preserved in StockLedger | ✅ Safe       | No data loss                   |
| **Data Integrity**          | Enforces cost > 0 at sale      | ✅ Good       | Prevents zero-cost sales       |

---

## 9. ARCHITECTURE READINESS FOR WAC

### Current Strengths:

✅ StockLedger is properly normalized (one entry per batch)  
✅ Costs are validated before sales  
✅ Historical costs are preserved  
✅ Reports fetch from StockLedger (not calculated fields)  
✅ Reference model allows linking sales to inventory

### Gaps to Fill (PHASE 2):

1. Add `ShopProduct.avgCost` field (new column)
2. Implement Weighted Average formula on StockIn
3. Change Sales to use `avgCost` instead of `costPrice`
4. Store `costPerUnit` in InvoiceItem for audit trail
5. Update Reports to use InvoiceItem.costPerUnit (immutable)

### Safe to Proceed?

✅ **YES. All foundational data structures are correct.**

---

## 10. NEXT PHASE RECOMMENDATION

**PHASE 2 Ready**: Design Weighted Average Cost implementation

**Three new fields needed:**

1. `ShopProduct.avgCost` – Weighted average cost per unit
2. `ShopProduct.totalCostValue` – Total value of stock at hand (for calculation)
3. `InvoiceItem.costPerUnit` – Cost recorded at sale time (immutable)

**Backward Compatibility:**

- Keep `costPrice` as fallback for legacy data
- New sales use `avgCost` only
- Old sales continue using StockLedger cost

**No Data Loss:**

- StockLedger unchanged
- Historical invoices unchanged
- Profit recalculation only for new sales (with avgCost)

---

## Conclusion

**Current System Status**: ✅ **Structurally Sound**

The system correctly tracks batch-wise costs in StockLedger. The main limitation is the use of Last Purchase Price for profit calculation when costs fluctuate. The architecture is ready for upgrading to Weighted Average Cost without any breaking changes or data loss.

**Proceed to PHASE 2: Weighted Average Cost Design**
