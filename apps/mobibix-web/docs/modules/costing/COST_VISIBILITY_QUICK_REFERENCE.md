# Cost Visibility Fixes – Quick Reference

## 5 Frontend Fixes Implemented

### 1. Sales Product Picker – Show Cost Status

- **File**: `app/(app)/sales/create/page.tsx`
- **What Changed**: Product dropdown now shows cost badges
- **Badges**:
  - 🟢 "✓ Ready" – Cost is set and > 0
  - 🔴 "⚠ Cost Missing" – Cost is NULL or ≤ 0
- **Inline Warning**: Shows on line item if cost missing

### 2. Sales Error Handling – Parse Product Context

- **File**: `app/(app)/sales/create/page.tsx`
- **What Changed**: Errors now show product name
- **Old**: "Failed to create invoice"
- **New**: "iPhone 15 cannot be sold because cost is missing. Please add a purchase..."

### 3. Inventory Form – Enforce Cost > 0

- **File**: `app/(app)/inventory/page.tsx`
- **What Changed**: Cost input now requires min="0.01"
- **Helper Text**: "Cost must be greater than 0. This is required to sell products."
- **Prevents**: Form submission with cost ≤ 0

### 4. Stock Correction – Add Cost Input

- **File**: `src/components/inventory/StockCorrectionForm.tsx`
- **What Changed**: Cost field now visible and required
- **When Shown**:
  - Always for initial setup (PRODUCT_CREATE)
  - When adding stock (quantityValue > 0)
- **Warning**: "Stock added without cost cannot be sold"
- **Removed**: Hardcoded `costPrice: 0`

### 5. Product Table – Show Cost Status Column

- **File**: `app/(app)/products/page.tsx`
- **What Changed**: New "Cost Status" column added
- **Display**:
  - 🟢 "✓ Set" – Cost > 0
  - 🔴 "⚠ Not Set" – Cost is NULL or ≤ 0
- **Position**: Between "Sale Price" and "GST Rate"

---

## Backend Changes

### TypeScript Errors Fixed

- **File**: `src/core/sales/sales.service.ts`
- **Error 1**: Added `name` field to product select (line 152)
- **Error 2**: Used nullish coalescing for cost (line 432)

---

## User Journeys – Before vs After

### Journey 1: Creating Invoice with Missing Cost

**BEFORE**:

1. User searches for "iPhone"
2. No warning about cost
3. User selects product
4. User enters quantity and rate
5. User clicks "Generate Invoice"
6. ❌ Error: "Failed to create invoice" (confusing)

**AFTER**:

1. User searches for "iPhone"
2. 🔴 Sees "⚠ Cost Missing" badge
3. User selects product anyway
4. ⚠️ Inline warning appears: "This product cannot be sold until cost is set"
5. User clicks "Generate Invoice"
6. ✅ Error: "iPhone 15 cannot be sold because cost is missing. Please add a purchase or set the cost manually."
7. User knows exactly what to do

---

### Journey 2: Managing Products

**BEFORE**:

- Product table shows: Name, Category, Type, HSN, Sale Price, GST, Status, Actions
- ❌ No way to see which products lack cost without clicking Edit on each one
- ❌ Time-consuming to identify missing costs

**AFTER**:

- Product table shows: Name, Category, Type, HSN, Sale Price, **Cost Status**, GST, Status, Actions
- 🟢 Green "✓ Set" – Ready to sell
- 🔴 Red "⚠ Not Set" – Needs cost setup
- ✅ Can see all cost statuses at a glance

---

### Journey 3: Initial Stock Setup

**BEFORE**:

1. Click "Create Product" → Stock Correction Form opens
2. Select product, enter IMEIs/quantity
3. Select reason "INITIAL_SETUP"
4. Click "Submit Correction"
5. ❌ Stock created with costPrice = 0 (silently)
6. ❌ Later attempt to sell fails with confusing error

**AFTER**:

1. Click "Create Product" → Stock Correction Form opens
2. Select product, enter IMEIs/quantity
3. ⚠️ **NEW**: Cost Price field appears (required)
4. ⚠️ Warning: "Stock added without cost cannot be sold. Enter cost to make sellable."
5. User enters cost (must be > 0)
6. ✅ Stock created with proper cost
7. ✅ Product is immediately sellable

---

## Files Changed Summary

| File                      | FIX     | Lines Modified                 | Purpose                             |
| ------------------------- | ------- | ------------------------------ | ----------------------------------- |
| `sales.service.ts`        | Backend | 152, 432                       | Add name field, fix type error      |
| `sales/create/page.tsx`   | 1, 2    | 27, 262, 310, 518–535, 768–823 | Cost badges, error parsing, warning |
| `inventory/page.tsx`      | 3       | 284, 286                       | min="0.01", helper text             |
| `StockCorrectionForm.tsx` | 4       | 52, 89, 102–135, 380–401       | Cost input, validation, guidance    |
| `products/page.tsx`       | 5       | 383, 499–512                   | Cost status column                  |

---

## Testing Checklist

- [ ] Create sales invoice → see cost badges in dropdown
- [ ] Select product with missing cost → see inline warning
- [ ] Submit invoice with missing cost → see product name in error
- [ ] Try to add inventory with cost = 0 → form rejects it
- [ ] Try to add inventory with cost = 0.01 → form accepts it
- [ ] Create product with initial stock → cost input appears
- [ ] Try to create product with cost = 0 → error shown
- [ ] View product table → Cost Status column visible
- [ ] All products show either "✓ Set" or "⚠ Not Set"

---

## Rollback Plan (If Needed)

Each fix is independent. To disable any fix:

1. **Sales badges**: Remove lines 768–776 from sales/create/page.tsx
2. **Cost warning**: Remove lines 819–823 from sales/create/page.tsx
3. **Error parsing**: Revert lines 511–535 to original generic error handling
4. **Inventory validation**: Change min="0.01" back to min="0"
5. **Stock correction cost**: Remove lines 52, 89, 102–135, 380–401
6. **Product table column**: Remove "Cost Status" header and cell

---

## Deployment Notes

- ✅ No database migrations required
- ✅ No backend API changes
- ✅ No schema changes
- ✅ Backward compatible with existing data
- ✅ Safe to deploy frontend alone
- ✅ Safe to deploy backend fixes alone
- ✅ Works with or without backend cost enforcement (but enforcement strongly recommended)
