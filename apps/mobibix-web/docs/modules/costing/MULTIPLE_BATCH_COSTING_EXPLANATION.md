# Multiple Batch Costing – How It Works ✅

**Question**: What happens if I add cost ₹50 for 10 stocks, then ₹70 for 10 stocks of the same product?  
**Answer**: Both costs are tracked separately in the StockLedger, and the product's current `costPrice` field shows the latest cost.

---

## The Scenario

**Product**: iPhone 15

### Step 1: Add First Batch

```
Quantity: 10 units
Cost per unit: ₹50
Total cost: ₹500
```

### Step 2: Add Second Batch

```
Quantity: 10 units
Cost per unit: ₹70
Total cost: ₹700
```

---

## What Gets Stored

### StockLedger (Database) – Tracks Every Batch

**Entry 1** (First Batch):

```
┌─────────────────────────────────────┐
│ StockLedger Entry                   │
├─────────────────────────────────────┤
│ shopProductId: "iphone-15-001"      │
│ type: "IN"                          │
│ quantity: 10                        │
│ costPerUnit: 50                     │ ← Cost tracked!
│ referenceType: "PURCHASE"           │
│ createdAt: 2026-02-01 10:00:00      │
└─────────────────────────────────────┘
```

**Entry 2** (Second Batch):

```
┌─────────────────────────────────────┐
│ StockLedger Entry                   │
├─────────────────────────────────────┤
│ shopProductId: "iphone-15-001"      │
│ type: "IN"                          │
│ quantity: 10                        │
│ costPerUnit: 70                     │ ← Different cost tracked!
│ referenceType: "PURCHASE"           │
│ createdAt: 2026-02-01 11:00:00      │
└─────────────────────────────────────┘
```

### ShopProduct (Product Record) – Shows Latest Cost

```
Product: iPhone 15
┌─────────────────────────────────────┐
│ ShopProduct Fields                  │
├─────────────────────────────────────┤
│ id: "iphone-15-001"                 │
│ name: "iPhone 15"                   │
│ salePrice: 100                      │
│ costPrice: 70          ← Latest cost │
│ stockQty: 20           ← Total stock │
│     (10 @ 50 + 10 @ 70) │
└─────────────────────────────────────┘
```

---

## Current Behavior

| Aspect                    | Behavior                           | Impact                              |
| ------------------------- | ---------------------------------- | ----------------------------------- |
| **StockLedger**           | ✅ Tracks each batch with its cost | Good – historical data preserved    |
| **ShopProduct.costPrice** | ⚠️ Shows only latest cost (70)     | Issue – doesn't reflect mixed costs |
| **Profit Calculation**    | ❓ Depends on costing method       | See below                           |
| **Total Stock**           | ✅ Shows correct total (20)        | Good – quantities sum correctly     |

---

## Profit Calculation Question

When you sell a product with mixed costs, **which cost should be used?**

### Current System (Single costPrice Field)

The system currently uses `ShopProduct.costPrice` which is the **latest cost** (₹70).

**If you sell 10 units at ₹100 sale price:**

```
Revenue:           100 × 10 = 1,000
Cost Used:         70 × 10 = 700    (Uses latest cost!)
Profit:            1,000 - 700 = 300
Profit Margin:     30%
```

**But actually:**

- 10 units were bought @ ₹50 = ₹500 actual cost
- 10 units were bought @ ₹70 = ₹700 actual cost
- Actual profit depends on WHICH batch was sold

---

## Inventory Costing Methods

The StockLedger tracks individual batches, allowing different costing methods:

### 1. FIFO (First In, First Out) – Most Accurate

When selling, use the **oldest batch first**.

**If you sell 15 units:**

- 10 units from first batch @ ₹50 = ₹500
- 5 units from second batch @ ₹70 = ₹350
- **Total cost: ₹850**
- **Profit: 1,500 - 850 = ₹650** (if selling at ₹100)

### 2. LIFO (Last In, First Out)

When selling, use the **newest batch first**.

**If you sell 15 units:**

- 10 units from second batch @ ₹70 = ₹700
- 5 units from first batch @ ₹50 = ₹250
- **Total cost: ₹950**
- **Profit: 1,500 - 950 = ₹550**

### 3. Weighted Average Cost

Average of all costs in stock.

**Current stock:** 20 units

- 10 @ ₹50 = ₹500
- 10 @ ₹70 = ₹700
- **Total cost: ₹1,200**
- **Average cost: ₹1,200 ÷ 20 = ₹60**

**If you sell 15 units:**

- Cost: ₹60 × 15 = ₹900
- **Profit: 1,500 - 900 = ₹600**

### 4. Standard Cost (Current Implementation)

Use a **fixed standard cost** per product (the latest cost).

**Always uses:** ₹70 per unit (latest `costPrice`)

- **Simple but inaccurate** for mixed batches

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│           Inventory Management Flow                 │
└─────────────────────────────────────────────────────┘

ADD STOCK
    ↓
StockInSingleProduct() → Creates StockLedger entry
    ├─ Batch 1: qty=10, cost=50
    └─ Batch 2: qty=10, cost=70
    ↓
ShopProduct.costPrice = 70 (Latest cost updated)
ShopProduct.stockQty = 20 (Total quantity)

─────────────────────────────────────────────────────

SELL PRODUCT
    ↓
SalesService.createInvoice()
    ├─ Fetches ShopProduct.costPrice = 70
    ├─ Uses it for all units
    └─ Calculates profit based on ₹70
    ↓
Report shows:
    Revenue: Correct
    Cost: ₹70 × qty (simplified)
    Profit: May be inaccurate if mixed batches
```

---

## Data Model (Simplified)

```typescript
// ShopProduct (single record per product)
{
  id: "iphone-15",
  name: "iPhone 15",
  salePrice: 100,
  costPrice: 70,      // ← Latest cost (updated each time)
  stockQty: 20        // ← Total from all batches
}

// StockLedger (multiple entries)
[
  {
    shopProductId: "iphone-15",
    quantity: 10,
    costPerUnit: 50,   // ← First batch cost (preserved)
    type: "IN"
  },
  {
    shopProductId: "iphone-15",
    quantity: 10,
    costPerUnit: 70,   // ← Second batch cost (preserved)
    type: "IN"
  }
]
```

---

## Current Limitations & Solutions

### Limitation 1: costPrice Field Overwritten

**Problem**: When you add new stock with different cost, it overwrites the old one.  
**Current Behavior**: ✅ StockLedger keeps history, ⚠️ ShopProduct shows only latest  
**Solution Needed**: Implement FIFO/Weighted Average calculation

### Limitation 2: Profit Calculations May Be Inaccurate

**Problem**: When selling mixed batches, profit varies based on costing method.  
**Current Behavior**: Uses latest cost (could be inflated)  
**Solution Needed**: Implement proper costing method selection

### Limitation 3: No Batch Tracking

**Problem**: When selling, system doesn't know which specific batch was sold.  
**Current Behavior**: ⚠️ Assumes all units are same cost  
**Solution Needed**: Link sales to specific stock ledger entries

---

## What You Should Know

✅ **All stock costs are preserved** in StockLedger  
✅ **Total stock quantity is correct** (sum of all batches)  
✅ **Cost tracking is granular** (per-batch, per-date)  
⚠️ **costPrice field shows latest cost** (not average)  
⚠️ **Profit calculations use latest cost** (may not be accurate)  
❓ **FIFO/LIFO not automatically applied** (needs implementation)

---

## Practical Examples

### Example 1: Mixed Batches, Sell Oldest First (FIFO)

```
Stock Position:
- 10 @ ₹50 (added Jan 1)
- 10 @ ₹70 (added Jan 2)

Sell 15 units @ ₹100:
Cost: (10×50) + (5×70) = 500+350 = 850
Revenue: 15×100 = 1,500
Profit: 650
Margin: 43%

Current System Calculates:
Cost: 15×70 = 1,050
Profit: 450
Margin: 30%
⚠️ Understates actual profit
```

### Example 2: Stock with Same Batch Cost

```
Stock Position:
- 10 @ ₹50 (added Jan 1)
- 10 @ ₹50 (added Jan 2)  ← Same cost!

Sell 15 units @ ₹100:
Cost: 15×50 = 750
Revenue: 15×100 = 1,500
Profit: 750
Margin: 50%

Current System Calculates:
Cost: 15×50 = 750  ← Still correct!
Profit: 750
Margin: 50%
✅ Accurate (costs match)
```

---

## Recommendations

### Short Term (Current)

- ✅ Use current system as-is
- ✅ Works fine for products with stable costs
- ⚠️ Be aware of accuracy loss with volatile costs

### Medium Term

- 📋 Add UI to show "Stock with different costs"
- 📋 Display weighted average cost
- 📋 Show cost per batch in stock view

### Long Term

- 🎯 Implement FIFO costing method
- 🎯 Link sales to specific stock ledger entries
- 🎯 Calculate accurate profit by costing method
- 🎯 Add cost variance reporting
- 🎯 Support multiple costing methods per shop

---

## Testing the Mixed-Cost Scenario

```bash
# 1. Add iPhone 15 with cost ₹50, qty 10
POST /inventory/stock-in
{
  "shopProductId": "iphone-15",
  "quantity": 10,
  "costPerUnit": 50
}

# 2. Add iPhone 15 with cost ₹70, qty 10
POST /inventory/stock-in
{
  "shopProductId": "iphone-15",
  "quantity": 10,
  "costPerUnit": 70
}

# 3. Check StockLedger
SELECT * FROM StockLedger
WHERE shopProductId = 'iphone-15'
ORDER BY createdAt;

# Result:
# Entry 1: qty=10, cost=50 ✓
# Entry 2: qty=10, cost=70 ✓

# 4. Check ShopProduct
SELECT name, costPrice, stockQty
FROM ShopProduct
WHERE id = 'iphone-15';

# Result:
# iPhone 15 | cost=70 | qty=20 ⚠️ (latest cost)
```

---

## Summary

| Aspect             | Status        | Details                                        |
| ------------------ | ------------- | ---------------------------------------------- |
| **Batch Tracking** | ✅ Yes        | Each batch recorded in StockLedger             |
| **Cost per Batch** | ✅ Yes        | costPerUnit stored with entry                  |
| **History**        | ✅ Yes        | All entries timestamped and dated              |
| **Total Stock**    | ✅ Yes        | Correctly sums all batches                     |
| **Latest Cost**    | ✅ Yes        | ShopProduct.costPrice updated                  |
| **Cost Accuracy**  | ⚠️ Partial    | Works for stable costs, issues with volatility |
| **Costing Method** | ❌ Not Yet    | No FIFO/LIFO/Weighted Average implementation   |
| **Profit Calc**    | ⚠️ Simplified | Uses latest cost, may be inaccurate            |

**Your data is safe and complete. Profit calculations are simplified but functional.**
