# 📊 Inventory/Stock Architecture - Visual Guide

---

## Current Architecture (After Fixes)

```
╔════════════════════════════════════════════════════════════════════════════════╗
║                      INVENTORY/STOCK ARCHITECTURE                              ║
╚════════════════════════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────────────────────────┐
│                          PRODUCT MASTER                                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│  ShopProduct {id, name, costPrice, salePrice, isSerialized}                     │
│  └─ isSerialized = true  → Units tracked individually (e.g., mobiles)          │
│  └─ isSerialized = false → Quantity tracked in bulk (e.g., chargers)           │
└─────────────────────────────────────────────────────────────────────────────────┘
         ↓                                ↓
    ┌────────────────┐          ┌────────────────────┐
    │  SERIALIZED    │          │      BULK          │
    │   PRODUCTS     │          │    PRODUCTS        │
    └────────────────┘          └────────────────────┘
         ↓                              ↓
    ┌────────────────┐          ┌────────────────────┐
    │    IMEI        │          │  StockLedger       │
    │   (UNITS)      │          │  (QUANTITY)        │
    ├────────────────┤          ├────────────────────┤
    │ id             │          │ type: IN/OUT       │
    │ imei: unique   │          │ quantity: count    │
    │ status:        │          │ reference: link    │
    │  IN_STOCK      │          │ costPerUnit        │
    │  SOLD          │          └────────────────────┘
    │  RETURNED      │
    │  DAMAGED       │          Example: StockLedger entries
    │  TRANSFERRED   │          ┌─────────────────────┐
    │  LOST          │          │ IN: 10 (purchase)   │
    │ soldAt         │          │ OUT: 2 (repair)     │
    │ returnedAt     │          │ OUT: 3 (sale)       │
    │ damageNotes    │          │ IN: 1 (return)      │
    └────────────────┘          │ ─────────────────   │
                                │ Available: 6        │
    Example IMEI records        └─────────────────────┘
    ┌─────────────────┐
    │ ABC123: IN_STOCK│
    │ ABC124: SOLD    │
    │ ABC125: RETURNED│
    │ ABC126: DAMAGED │
    └─────────────────┘
```

---

## Stock Movement Flow

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                        STOCK MOVEMENT TRACKING                                  │
└────────────────────────────────────────────────────────────────────────────────┘

PURCHASE (Supplier → Stock)
═════════════════════════════════════════════════════════════════════════════════
  Purchase Item
      ↓
  ┌─────────────────────────────┐
  │ StockLedger: IN             │
  │ qty: 10                     │
  │ ref: PURCHASE / PurchaseItem.id  │
  │ costPerUnit: 500            │
  └─────────────────────────────┘
      ↓
  StockLedger.quantity = 10 IN

SALE (Stock → Customer)
═════════════════════════════════════════════════════════════════════════════════
  Invoice Item + IMEI
      ↓
  Serialized Products:
  ┌─────────────────────────────┐
  │ IMEI: ABC123                │
  │ status: SOLD (← CHANGED)    │
  │ invoiceId: INV001           │
  │ soldAt: 2026-01-27T10:00Z   │
  └─────────────────────────────┘

  Bulk Products:
  ┌─────────────────────────────┐
  │ StockLedger: OUT            │
  │ qty: 3                      │
  │ ref: SALE / InvoiceItem.id  │
  └─────────────────────────────┘

REPAIR (Stock → Parts Used)
═════════════════════════════════════════════════════════════════════════════════
  Add Part to Repair Job
      ↓
  ┌──────────────────────────────┐
  │ RepairPartUsed               │
  │ qty: 2                       │
  │ costPerUnit: 100             │
  └──────────────────────────────┘
      ↓
  ┌──────────────────────────────┐
  │ StockLedger: OUT             │
  │ qty: 2                       │
  │ ref: REPAIR / RepairPartUsed │
  │ costPerUnit: 100             │
  └──────────────────────────────┘

  Cancel Repair? → Creates reversal IN entry!
  ┌──────────────────────────────┐
  │ StockLedger: IN              │
  │ qty: 2                       │
  │ ref: REPAIR / RepairPartUsed │
  │ note: "Reversal: cancelled"  │
  └──────────────────────────────┘

RETURN (Customer → Stock)
═════════════════════════════════════════════════════════════════════════════════
  Return Invoice
      ↓
  Serialized Products:
  ┌─────────────────────────────┐
  │ IMEI: ABC123                │
  │ status: RETURNED (← CHANGED)│
  │ returnedAt: 2026-01-27T12:00Z │
  │ invoiceId: NULL             │
  └─────────────────────────────┘

  Bulk Products:
  ┌─────────────────────────────┐
  │ StockLedger: IN             │
  │ qty: 3                      │
  │ ref: SALE / InvoiceItem.id  │
  │ note: "Reversal: return"    │
  └─────────────────────────────┘
```

---

## Stock Calculation Logic

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                    HOW TO CALCULATE AVAILABLE STOCK                          │
└──────────────────────────────────────────────────────────────────────────────┘

SERIALIZED PRODUCT (e.g., iPhone)
═════════════════════════════════════════════════════════════════════════════════
  Query: COUNT WHERE status = 'IN_STOCK'

  IMEI Records:
  ┌──────────────────────┐
  │ ABC1: IN_STOCK       │ ✓ Count = 1
  │ ABC2: IN_STOCK       │ ✓ Count = 1
  │ ABC3: SOLD           │ ✗ Don't count
  │ ABC4: RETURNED       │ ✗ Don't count
  │ ABC5: DAMAGED        │ ✗ Don't count
  └──────────────────────┘

  Available Stock = 2 units

  SQL: SELECT COUNT(*) FROM IMEI
       WHERE shopProductId = '...' AND status = 'IN_STOCK'

BULK PRODUCT (e.g., Charger)
═════════════════════════════════════════════════════════════════════════════════
  Query: SUM(IN entries) - SUM(OUT entries)

  StockLedger Entries:
  ┌──────────────────────┐
  │ IN: 20 (purchase)    │ ✓ Add
  │ OUT: 3 (sale)        │ ✗ Subtract
  │ OUT: 2 (repair)      │ ✗ Subtract
  │ IN: 1 (return)       │ ✓ Add
  │ OUT: 2 (damage)      │ ✗ Subtract
  └──────────────────────┘

  Available Stock = 20 - 3 - 2 + 1 - 2 = 14 units

  SQL: SELECT
       SUM(CASE WHEN type='IN' THEN quantity ELSE -quantity END)
       FROM StockLedger
       WHERE shopProductId = '...'
```

---

## Validation Flow

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                    STOCK OUT - VALIDATION REQUIRED                           │
└──────────────────────────────────────────────────────────────────────────────┘

  User tries: Use 5 units in repair, but only 3 available

  ┌─────────────────────────────────┐
  │ StockService.recordStockOut()    │
  └─────────────────────────────────┘
           ↓
  ┌─────────────────────────────────┐
  │ Calculate current stock         │
  │ (via IMEI.count or SUM ledger)  │
  │ Result: 3 units                 │
  └─────────────────────────────────┘
           ↓
  ┌─────────────────────────────────┐
  │ Check: current (3) >= requested (5)? │
  │ Result: NO ✗                    │
  └─────────────────────────────────┘
           ↓
  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
  ✗ REJECT: BadRequestException
    "Insufficient stock. Have: 3, Need: 5"


  But if valid:

  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
  ✓ PROCEED: Create StockLedger OUT

  ┌─────────────────────────────────┐
  │ INSERT INTO StockLedger         │
  │ type: 'OUT'                     │
  │ qty: 5                          │
  │ ref: REPAIR / RepairPartUsed.id │
  └─────────────────────────────────┘
```

---

## Data Integrity Guarantees

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         DATA INTEGRITY CHECKS                                │
└──────────────────────────────────────────────────────────────────────────────┘

BEFORE (Broken):
═════════════════════════════════════════════════════════════════════════════════
  Add repair parts → RepairPartUsed created
  Stock → NOT decremented (silent leak!)

  StockLedger:
  ┌──────────────┐
  │ IN: 10       │ Actual: 8 (2 used in repair)
  │              │ Reported: 10 ✗ WRONG
  └──────────────┘

AFTER (Fixed):
═════════════════════════════════════════════════════════════════════════════════
  Add repair parts → RepairPartUsed created
           ↓
  Automatically create StockLedger OUT
           ↓
  Stock query returns: IN - OUT = correct value

  StockLedger:
  ┌──────────────┐
  │ IN: 10       │
  │ OUT: 2       │ Actual: 8
  │ (repair)     │ Reported: 8 ✓ CORRECT
  └──────────────┘
```

---

## IMEI Status Transitions

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                      IMEI LIFECYCLE / STATUS FLOW                            │
└──────────────────────────────────────────────────────────────────────────────┘

Creation:
═════════════════════════════════════════════════════════════════════════════════
  Purchase IMEI ABC123
  → status: IN_STOCK
  → createdAt: timestamp

Available State:
═════════════════════════════════════════════════════════════════════════════════
  status: IN_STOCK ─────────────────────────┐
           ↓                                 │
  Can be:                                   │
  - Allocated to repair                     │
  - Sold to customer                        │
  - Marked as damaged                       │
  - Transferred to another shop             │
  - Marked as lost                          │

Sale Path:
═════════════════════════════════════════════════════════════════════════════════
  Invoice created with IMEI ABC123
      ↓
  status: SOLD
  invoiceId: INV001
  soldAt: 2026-01-27T10:00Z
      ↓
  ┌──────────────────────┐
  │ Two possible paths:  │
  └──────────────────────┘
       ↙              ↘

  Customer Keeps:       Customer Returns:
  status: SOLD ◄────────→ status: RETURNED
  (final)               returnedAt: timestamp
                        invoiceId: NULL
                            ↓
                        Back to IN_STOCK?
                        (Up to business rules)

Damage Path:
═════════════════════════════════════════════════════════════════════════════════
  Unit damaged discovered
      ↓
  status: DAMAGED
  damageNotes: "Screen broken"
  updatedAt: timestamp
      ↓
  Cannot be sold (must be fixed or scrapped)

Lost Path:
═════════════════════════════════════════════════════════════════════════════════
  Unit missing
      ↓
  status: LOST
  updatedAt: timestamp
      ↓
  Removed from saleable inventory

Transfer Path:
═════════════════════════════════════════════════════════════════════════════════
  Transfer to different shop
      ↓
  status: TRANSFERRED
  updatedAt: timestamp
      ↓
  (shopProductId stays same - need separate logic for shop transfer)
```

---

## Report Examples (Post-Fix)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                      AVAILABLE REPORTS (NOW ACCURATE)                        │
└──────────────────────────────────────────────────────────────────────────────┘

INVENTORY VALUE REPORT:
═════════════════════════════════════════════════════════════════════════════════
  Product          Stock    Cost/Unit    Total Value
  ─────────────────────────────────────────────────
  iPhone 15          15       50,000      750,000
  Samsung S24        12       45,000      540,000
  Charger USB        200         500      100,000
  Screen Guard       450         200       90,000
  Battery           100       2,000      200,000
  ─────────────────────────────────────────────────
  TOTAL INVENTORY VALUE:              1,680,000

  ✓ Accurate because:
    - IMEI.count for serialized
    - StockLedger sum for bulk
    - costPerUnit tracked


REPAIR COST ANALYSIS:
═════════════════════════════════════════════════════════════════════════════════
  Job    Parts Used    Cost     Status
  ──────────────────────────────────────
  JC001  Battery       2,000    DELIVERED
         Screen        5,000

  JC002  Charger         500    IN_PROGRESS
  JC003  (Cancelled)
         [Parts reversed]      CANCELLED
  ──────────────────────────────────────────
  Total Repair Parts:  7,500

  ✓ Accurate because:
    - costPerUnit stored
    - Cancellations reversed
    - No silent leaks


IMEI STATUS BREAKDOWN:
═════════════════════════════════════════════════════════════════════════════════
  Product          IN_STOCK   SOLD   RETURNED   DAMAGED   LOST
  ───────────────────────────────────────────────────────────
  iPhone 15           15      42        8          3        2
  Samsung S24         12      35        5          1        0
  ───────────────────────────────────────────────────────────

  ✓ Accurate because:
    - Explicit status field
    - No guessing from invoiceId
    - Damage/returns tracked separately
```

---

## Before vs After Comparison

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                         PROBLEM → SOLUTION MATRIX                              │
└────────────────────────────────────────────────────────────────────────────────┘

Issue 1: stockOnHand never updated
BEFORE: ❌ Always 0                    AFTER: ✓ Derived from StockLedger

Issue 2: Serialized vs Bulk confusion
BEFORE: ❌ ProductType overloaded     AFTER: ✓ isSerialized flag explicit

Issue 3: IMEI status unclear
BEFORE: ❌ Inferred from invoiceId    AFTER: ✓ Explicit enum status

Issue 4: serialNumber redundant
BEFORE: ❌ In ShopProduct              AFTER: ✓ Only in IMEI

Issue 5: No stock validation
BEFORE: ❌ Negative allowed            AFTER: ✓ Validated before OUT

Issue 6: Cost per unit missing
BEFORE: ❌ No COGS tracking            AFTER: ✓ costPerUnit field

Issue 7: Repairs not tracked
BEFORE: ❌ Silent stock leaks          AFTER: ✓ StockLedger linkage

Issue 8: No reference traceability
BEFORE: ❌ Audit trail incomplete     AFTER: ✓ Complete trace with refs
```

---

## Summary Checklist

```
✅ Schema Changes:
   ✓ ShopProduct: Added isSerialized, removed serialNumber/reservedStock
   ✓ IMEI: Added status, updatedAt, soldAt, returnedAt, damageNotes
   ✓ StockLedger: Added costPerUnit, better indexing
   ✓ RepairPartUsed: Added costPerUnit, updatedAt
   ✓ New enum: IMEIStatus with 6 states

✅ Business Rules Enforced:
   ✓ Stock OUT must be validated
   ✓ Repairs must link to StockLedger
   ✓ Cancellations must be reversible
   ✓ IMEI status is single source of truth
   ✓ Cost per unit tracked for COGS

✅ Reports Accuracy:
   ✓ Available stock correct
   ✓ Inventory value correct
   ✓ Repair costs tracked
   ✓ IMEI status breakdown accurate
   ✓ No silent stock leaks

✅ Audit Trail:
   ✓ All movements traceable
   ✓ Timestamps on all actions
   ✓ Reference IDs to source
   ✓ Damage notes documented
   ✓ Return audit trail
```

---

**This architecture ensures data integrity, prevents stock leaks, and provides complete audit trails for all inventory movements.**
