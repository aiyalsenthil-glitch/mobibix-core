# Inventory/Stock Quick Reference

## Key Rules (DO NOT VIOLATE)

### 1. StockLedger = Single Source of Truth

```typescript
// ✅ CORRECT: Calculate stock from ledger
const stock = await stockService.getCurrentStock(productId, tenantId);

// ❌ WRONG: Use stockOnHand field
const stock = product.stockOnHand; // Always 0, never updated
```

### 2. Validate Before Stock OUT

```typescript
// ✅ CORRECT: Use recordStockOut (has validation)
await stockService.recordStockOut(
  tenantId,
  shopId,
  productId,
  quantity,
  'SALE',
  invoiceId,
  costPerUnit,
  imeis,
);

// ❌ WRONG: Direct StockLedger insert (no validation)
await prisma.stockLedger.create({
  data: { type: 'OUT', quantity: 999999 }, // Can go negative!
});
```

### 3. SERVICE Products Have No Stock

```typescript
// ✅ CORRECT: Check type before stock operations
if (product.type === 'SERVICE') {
  throw new BadRequestException('SERVICE products cannot have stock');
}

// ❌ WRONG: Allow SERVICE in stock operations
await stockService.stockInSingleProduct({ productId: serviceProductId });
```

### 4. Serialized Products Need IMEIs

```typescript
// ✅ CORRECT: Check isSerialized flag
if (product.isSerialized) {
  if (!imeis || imeis.length !== quantity) {
    throw new BadRequestException('IMEIs required for serialized products');
  }
}

// ❌ WRONG: Assume all GOODS need IMEIs
if (product.type === 'GOODS') {
  // Some GOODS are bulk, not serialized
  // ...
}
```

### 5. IMEI Status Drives Availability

```typescript
// ✅ CORRECT: Use status field
const available = await prisma.iMEI.count({
  where: { shopProductId, status: 'IN_STOCK' },
});

// ❌ WRONG: Infer from invoiceId
const available = await prisma.iMEI.count({
  where: { shopProductId, invoiceId: null }, // Doesn't handle DAMAGED/RETURNED
});
```

### 6. IMEI Format — 15-16 Digits Only

```typescript
// ✅ CORRECT: Standard IMEI is 15 digits (IMEI-SV: 16 digits)
isValidIMEIFormat('358000000000000'); // true  — 15 digits
isValidIMEIFormat('3580000000000001'); // true  — 16 digits (IMEI-SV)

// ❌ WRONG: 14-digit MEID or 17+ digit codes are rejected
isValidIMEIFormat('35800000000000');   // false — 14 digits
isValidIMEIFormat('358000000000000123'); // false — too long
```

### 7. Duplicate IMEIs Must Throw, Not Silently Skip

```typescript
// ✅ CORRECT: Pre-check for duplicates, reject explicitly
const existing = await prisma.iMEI.findMany({
  where: { tenantId, imei: { in: imeis } },
  select: { imei: true },
});
if (existing.length > 0) {
  throw new BadRequestException(
    `IMEI(s) already exist in inventory: ${existing.map(e => e.imei).join(', ')}`,
  );
}

// ❌ WRONG: skipDuplicates silently drops re-entered IMEIs
await prisma.iMEI.createMany({ data: [...], skipDuplicates: true });
```

### 6. Repairs Must Link to StockLedger

```typescript
// ✅ CORRECT: Create both RepairPartUsed and StockLedger OUT
await prisma.$transaction([
  prisma.repairPartUsed.create({
    data: { jobCardId, shopProductId, quantity },
  }),
  prisma.stockLedger.create({
    data: {
      type: 'OUT',
      quantity,
      referenceType: 'REPAIR',
      referenceId: jobCardId,
    },
  }),
]);

// ❌ WRONG: Only RepairPartUsed (silent stock leak)
await prisma.repairPartUsed.create({
  data: { jobCardId, shopProductId, quantity },
});
```

### 7. Cancellations Must Reverse Stock

```typescript
// ✅ CORRECT: Create IN entry to reverse OUT
await prisma.stockLedger.create({
  data: {
    type: 'IN',
    quantity: originalQuantity,
    referenceType: 'REPAIR',
    referenceId: jobCardId,
    note: 'Reversal: Job cancelled',
  },
});

// ❌ WRONG: Delete OUT entry (breaks audit trail)
await prisma.stockLedger.deleteMany({
  where: { referenceType: 'REPAIR', referenceId: jobCardId },
});
```

---

## Product Type Matrix

| Product Type | isSerialized | Tracking Method | Stock Operations | IMEI Required  |
| ------------ | ------------ | --------------- | ---------------- | -------------- |
| GOODS        | true         | IMEI per unit   | IN/OUT allowed   | Yes (per unit) |
| GOODS        | false        | Quantity-based  | IN/OUT allowed   | No             |
| SPARE        | true         | IMEI per unit   | IN/OUT allowed   | Yes (per unit) |
| SPARE        | false        | Quantity-based  | IN/OUT allowed   | No             |
| SERVICE      | false (only) | None            | IN/OUT BLOCKED   | No (enforced)  |

---

## IMEI Status Flow

```
GRN / Purchase
   ↓
IN_STOCK ──────────────────────────────────────────────────────┐
   │                                                           │
   ├─[reserve]──→ RESERVED ──[release]──────────────────────→ IN_STOCK
   │                                                           │
   ├─[sell]─────→ SOLD                                        │
   │               │                                           │
   │               ├─→ RETURNED ──────────────────────────────┘
   │               ├─→ RETURNED_GOOD ──────────────────────────┘
   │               └─→ RETURNED_DAMAGED ─→ DAMAGED / SCRAPPED
   │
   ├─[transfer]──→ TRANSFERRED (shopId updated, status → IN_STOCK at new shop)
   ├─[damage]────→ DAMAGED
   ├─[loss]──────→ LOST
   └─[scrap]─────→ SCRAPPED

Allowed transitions (backend-enforced):
  IN_STOCK       → DAMAGED, LOST, SCRAPPED, RESERVED
  SOLD           → RETURNED, RETURNED_GOOD, RETURNED_DAMAGED
  RESERVED       → IN_STOCK, SOLD
  RETURNED       → IN_STOCK, DAMAGED, SCRAPPED
  RETURNED_GOOD  → IN_STOCK
  RETURNED_DAMAGED → DAMAGED, SCRAPPED

Note: RETURNED → IN_STOCK automatically increments product.quantity by 1.
```

---

## Common Queries

### Get Available Stock (Bulk Product)

```typescript
const entries = await prisma.stockLedger.findMany({
  where: { shopProductId, tenantId },
  select: { type: true, quantity: true },
});

const stock = entries.reduce(
  (sum, e) => (e.type === 'IN' ? sum + e.quantity : sum - e.quantity),
  0,
);
```

### Get Available Stock (Serialized Product)

```typescript
const count = await prisma.iMEI.count({
  where: {
    shopProductId,
    tenantId,
    status: 'IN_STOCK',
  },
});
```

### Get Stock Value (COGS)

```typescript
const entries = await prisma.stockLedger.findMany({
  where: { shopProductId, type: 'IN' },
  select: { quantity: true, costPerUnit: true },
});

const totalValue = entries.reduce(
  (sum, e) => sum + e.quantity * (e.costPerUnit || 0),
  0,
);
```

### Trace Stock Movement

```typescript
const history = await prisma.stockLedger.findMany({
  where: {
    referenceType: 'REPAIR',
    referenceId: jobCardId,
  },
  orderBy: { createdAt: 'asc' },
});
// Shows: OUT when parts added, IN when job cancelled
```

### Get IMEI Lifecycle

```typescript
const imei = await prisma.iMEI.findUnique({
  where: { tenantId_imei: { tenantId, imei: '358000000000000' } },
  include: { invoice: true, product: true },
});

console.log({
  status: imei.status,       // Current status (IN_STOCK, SOLD, etc.)
  purchased: imei.createdAt,
  sold: imei.soldAt,
  returned: imei.returnedAt,
  invoice: imei.invoice?.invoiceNumber,
  damageNotes: imei.damageNotes, // Populated on DAMAGED/RETURNED_DAMAGED
  lostReason: imei.lostReason,   // Populated on LOST
});
```

### IMEI Management API Endpoints

```
GET    /mobileshop/stock/imei                  — List IMEIs (filter: status, shopId, productId, search, page, limit)
GET    /mobileshop/stock/imei/:imei            — Get single IMEI details
PATCH  /mobileshop/stock/imei/:imei/status     — Update status { status, notes? }
POST   /mobileshop/stock/imei/:imei/transfer   — Transfer to shop { targetShopId }
POST   /mobileshop/stock/imei/:imei/reserve    — Reserve (IN_STOCK → RESERVED)
DELETE /mobileshop/stock/imei/:imei/reserve    — Release reserve (RESERVED → IN_STOCK)
```

All IMEI endpoints require: `INVENTORY.EDIT` permission (except GET which needs `INVENTORY.VIEW`).

---

## Error Messages to Watch For

| Error | Meaning | Fix |
| --- | --- | --- |
| "SERVICE products cannot have stock" | Tried to stock-in/out a SERVICE product | Only use SERVICE for labor, not physical items |
| "Insufficient stock. Available: X, Required: Y" | Not enough stock for OUT operation | Check stock before issuing parts/sales |
| "Serialized products require IMEI list" | Missing IMEIs for isSerialized=true product | Provide imeis[] array matching quantity |
| "IMEI not available (status: SOLD)" | Tried to sell already-sold IMEI | Check IMEI status before sale |
| "IMEI(s) already exist in inventory: …" | Re-entered an IMEI already in system (GRN) | Each IMEI is unique per tenant — check for re-receipt |
| "Invalid IMEI format(s): … IMEI must be 15 digits" | IMEI is not 15-16 digits | Scan the barcode again; ensure it is a valid IMEI |
| "Cannot transition IMEI from X to Y" | Invalid status change attempted | Check allowed transitions table above |
| "Only IN_STOCK IMEIs can be transferred" | Tried to transfer a sold/damaged device | Update status to IN_STOCK first (e.g. via return) |

---

## Migration Notes

**Applied Migration:** `fix_inventory_stock_separation`

**Backward Compatibility:**

- ✅ stockOnHand field kept (read-only, not source of truth)
- ✅ serialNumber removed from ShopProduct (use IMEI.imei instead)
- ✅ invoiceId in IMEI kept (plus new status field for reliability)
- ✅ New fields are nullable or have defaults (safe)

**Breaking Changes:**

- ❌ CreateProductDto.serialNumber removed → Use isSerialized flag
- ❌ IMEI availability logic changed → Use status instead of invoiceId

---

## Testing Commands

### Check Stock Balance

```sql
-- Bulk product
SELECT
  SUM(CASE WHEN type='IN' THEN quantity ELSE -quantity END) as stock
FROM "StockLedger"
WHERE "shopProductId" = 'PRODUCT_ID';

-- Serialized product
SELECT COUNT(*) as stock
FROM "IMEI"
WHERE "shopProductId" = 'PRODUCT_ID' AND status = 'IN_STOCK';
```

### Verify Repair Linkage

```sql
-- Check repairs have corresponding stock OUT
SELECT
  rpu."jobCardId",
  rpu.quantity as parts_used,
  COALESCE(sl.quantity, 0) as stock_out
FROM "RepairPartUsed" rpu
LEFT JOIN "StockLedger" sl ON
  sl."referenceType" = 'REPAIR' AND
  sl."referenceId" = rpu."jobCardId" AND
  sl."shopProductId" = rpu."shopProductId" AND
  sl.type = 'OUT'
WHERE rpu.quantity != COALESCE(sl.quantity, 0);
-- Empty result = all repairs properly linked
```

### Find Negative Stock (Should Be Zero)

```sql
WITH stock_calc AS (
  SELECT
    "shopProductId",
    SUM(CASE WHEN type='IN' THEN quantity ELSE -quantity END) as balance
  FROM "StockLedger"
  GROUP BY "shopProductId"
)
SELECT * FROM stock_calc WHERE balance < 0;
-- Empty result = validation working correctly
```

---

## Architecture Decisions

1. **Why StockLedger is source of truth?**
   - Immutable audit trail (never delete, only reverse)
   - Can trace every IN/OUT movement
   - Prevents data integrity issues from concurrent updates

2. **Why separate isSerialized flag?**
   - ProductType.GOODS can be bulk OR serialized
   - Clear distinction: isSerialized=true → IMEI mandatory
   - SERVICE type can never have stock (business rule)

3. **Why explicit IMEIStatus enum?**
   - invoiceId=null was overloaded (available? damaged? returned?)
   - Status makes lifecycle explicit
   - Enables damage/return tracking without breaking sales

4. **Why costPerUnit in StockLedger?**
   - Purchase price varies over time
   - COGS calculation requires historical cost
   - Inventory valuation needs weighted average cost

5. **Why reversal instead of deletion?**
   - Audit trail preservation (who did what when)
   - Prevents historical data corruption
   - Cancellation is a business event (should be tracked)

---

---

## Frontend — IMEI Tracker Page

**Route:** `/inventory/imei` (tab in Inventory layout)

**Capabilities:**
- Search by IMEI number
- Filter by status (all statuses supported)
- Paginated table (50 per page) with product, invoice, customer, and sold-at info
- **Update status** — guided modal, only shows valid next states per IMEI
- **Transfer** — move IN_STOCK/RESERVED IMEI to another shop (multi-shop tenants only)
- **Reserve / Release** — hold a device for a customer without invoicing

**Frontend API (`src/services/stock.api.ts`):**

| Function | Description |
| --- | --- |
| `getImeiList(filters)` | Paginated IMEI list |
| `getImeiDetails(imei)` | Single IMEI lookup (also used in sales barcode scan) |
| `updateImeiStatus(imei, status, notes?)` | State transition with optional notes |
| `transferImei(imei, targetShopId)` | Shop transfer |
| `reserveImei(imei)` | IN_STOCK → RESERVED |
| `releaseImeiReserve(imei)` | RESERVED → IN_STOCK |

**Print:** `PrintLineItem` now carries `imeis`, `serialNumbers`, `warrantyDays`, `warrantyEndAt` — invoice print templates can render sold IMEI numbers on the customer copy.

---

**Keep this guide handy when working with inventory/stock operations!**
