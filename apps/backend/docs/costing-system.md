# Costing System

## Purpose

Tracks and calculates product costs across stock movements and sales. Implements Weighted Average Cost (WAC) methodology for accurate profit calculation and inventory valuation.

## Key Responsibilities

- **Stock Cost Tracking**: Record cost per unit on stock IN
- **Weighted Average Calculation**: Recalculate avgCost on every IN
- **Sales Cost Validation**: Ensure products have valid costs before sale
- **Profit Reporting**: Provide accurate cost data for profit calculations
- **Backward Compatibility**: Support both LPP (legacy) and WAC costing methods

## Public Interfaces

### StockService

| Method                   | Purpose                            | Input                             | Output                             |
| ------------------------ | ---------------------------------- | --------------------------------- | ---------------------------------- |
| `stockInSingleProduct()` | Record stock IN with cost          | `{ productId, qty, costPerUnit }` | StockLedger entry, updated avgCost |
| `recordStockOut()`       | Record stock OUT (sale/adjustment) | `{ productId, qty, referenceId }` | StockLedger entry                  |
| `getCurrentStock()`      | Get current quantity               | `{ productId }`                   | `{ qty, avgCost, costPrice }`      |

### SalesService

| Method            | Purpose                        | Input                               | Output                                |
| ----------------- | ------------------------------ | ----------------------------------- | ------------------------------------- |
| `createInvoice()` | Create sale invoice            | `{ items: [...], customerId, ... }` | Invoice with costPerUnit from avgCost |
| Cost Validation   | Ensure all items have cost > 0 | Product data                        | Throws if cost missing                |

### InventoryService

| Method            | Purpose        | Input                         | Output                   |
| ----------------- | -------------- | ----------------------------- | ------------------------ |
| `createProduct()` | Create product | `{ name, type, shopId, ... }` | Product (no avgCost yet) |
| `updateProduct()` | Update product | `{ id, ...fields }`           | Updated product          |

## Business Rules

### 1. Cost Tracking

- Every stock IN creates StockLedger entry with `costPerUnit`
- costPerUnit is immutable after creation
- StockLedger tracks per-batch costs accurately

### 2. Weighted Average Cost (WAC)

```
newAvgCost = ((oldQty × oldAvgCost) + (inQty × inCost)) / (oldQty + inQty)
```

- Calculated on every stock IN
- Stored in ShopProduct.avgCost
- Used for sales cost validation

### 3. Cost Validation (Sales)

- Every sale item MUST have avgCost > 0 OR costPrice > 0
- Prevents selling items with null/zero cost
- Uses avgCost if present, falls back to costPrice
- Logs warning if fallback occurs

### 4. Cost Storage (InvoiceItem)

- costPerUnit is populated at sale time
- Stores avgCost value that was used
- Immutable after creation
- Used for profit reporting

### 5. Profit Calculation (Reports)

```
profit = (lineTotal - gstAmount) - (costPerUnit × quantity)
```

- costPerUnit sourced from InvoiceItem (new) or StockLedger OUT (legacy)
- Both paths yield same result: StockLedger.OUT.costPerUnit
- No calculation change needed

## Important Notes

### Migration & Backward Compatibility

- **Old Invoices**: costPerUnit = NULL, profit calculated from StockLedger
- **New Invoices**: costPerUnit = avgCost, profit calculated from InvoiceItem
- Both paths use same StockLedger data - no historical recalculation
- fallback: If avgCost NULL, use costPrice (degrades to LPP)

### Field Mapping

| Field         | Table       | Type | Purpose                            |
| ------------- | ----------- | ---- | ---------------------------------- |
| `avgCost`     | ShopProduct | INT  | Weighted average cost (Paisa)      |
| `costPrice`   | ShopProduct | INT  | Last purchase price (legacy)       |
| `costPerUnit` | StockLedger | INT  | Cost per batch (immutable)         |
| `costPerUnit` | InvoiceItem | INT  | Cost used at sale time (immutable) |

### When to Update avgCost

1. ✅ On stock IN (always)
2. ✅ On stock adjustment (if quantity changed)
3. ❌ NOT on stock OUT (sales don't affect average)
4. ❌ NOT on stock correction (correction is OUT + IN)

### Data Integrity Checks

- avgCost must match calculation: `(oldQty*oldAvg + newQty*newCost) / (oldQty + newQty)`
- All StockLedger IN entries must have costPerUnit
- All InvoiceItem entries (new) should have costPerUnit
- Reports must match: `revenue - (cost*qty) = profit`

### Future Enhancement: FIFO

- StockLedger structure already supports batch tracking
- Can implement FIFO without schema migration
- Recommendation: After WAC stabilizes (6+ months)

## Related Documentation

- Design Phase 1-5: `WAC_PHASE*.md` (repo root)
- Implementation Guide: `WAC_VERIFICATION_SUMMARY.md` (repo root)
