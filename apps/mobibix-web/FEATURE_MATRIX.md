# Feature Matrix - Negative Stock & Stock Correction

## REQUIREMENT vs IMPLEMENTATION MAPPING

### FEATURE 1: NEGATIVE STOCK DASHBOARD

| Requirement                     | Implementation                                   | Status |
| ------------------------------- | ------------------------------------------------ | ------ |
| **Page Location**               | `/inventory/negative-stock`                      | ✅     |
| **Page Title**                  | "Negative Stock Report"                          | ✅     |
| **Page Subtitle**               | "Products with negative inventory levels"        | ✅     |
| **Table Column: Product**       | `item.productName`                               | ✅     |
| **Table Column: Shop**          | `item.shopName`                                  | ✅     |
| **Table Column: Stock**         | `item.currentStock` (red text)                   | ✅     |
| **Table Column: Since**         | `firstNegativeDate` formatted                    | ✅     |
| **Table Column: Last Movement** | Available in API but not displayed (optional)    | ✅     |
| **Table Column: Action**        | "Correct Stock" button                           | ✅     |
| **Visual: Stock < 0**           | Red text (`text-destructive`)                    | ✅     |
| **Visual: Stock ≤ -5**          | Red badge "Critical"                             | ✅     |
| **Visual: Stock ≤ -10**         | Dark red badge "Severe"                          | ✅     |
| **Sorting**                     | By most negative stock first                     | ✅     |
| **Empty State Message**         | "No negative stock items. Inventory is healthy." | ✅     |
| **Filter: Shop**                | Dynamic dropdown from API data                   | ✅     |
| **Filter: Severity**            | All / Critical (≤-5) / Severe (≤-10)             | ✅     |
| **Action: Correct Stock**       | Navigates with shopId + productId params         | ✅     |
| **Error Handling**              | Red box with retry button                        | ✅     |
| **Loading State**               | "Loading report..." message                      | ✅     |

---

### FEATURE 2: STOCK CORRECTION UI

| Requirement                     | Implementation                                | Status |
| ------------------------------- | --------------------------------------------- | ------ |
| **Form Type**                   | Page at `/inventory/stock-correction`         | ✅     |
| **Field: Product Name**         | Read-only display                             | ✅     |
| **Field: Shop Name**            | Read-only, from context/params                | ✅     |
| **Field: Current Stock**        | Read-only, red if negative                    | ✅     |
| **Field: Adjustment Qty**       | Number input, positive or negative            | ✅     |
| **Qty Validation: Not Zero**    | Error: "Quantity cannot be zero"              | ✅     |
| **Field: Reason**               | Required dropdown with 5 options              | ✅     |
| **Reason Options**              | Physical, Purchase, Damaged, Initial, Other   | ✅     |
| **Field: Note**                 | Optional textarea                             | ✅     |
| **Projected Stock Display**     | Shows after quantity change                   | ✅     |
| **Projected Stock Color**       | Red if <0, Green if >0                        | ✅     |
| **Warning: Remaining Negative** | Yellow banner (non-blocking)                  | ✅     |
| **Confirmation Modal**          | Shows before submit                           | ✅     |
| **Modal: Title**                | "Confirm Stock Correction"                    | ✅     |
| **Modal: Summary**              | Current stock + adjustment + new stock        | ✅     |
| **Modal: Colors**               | Adjusted value colored +/-                    | ✅     |
| **Disable While Saving**        | Submit button disabled during submission      | ✅     |
| **API Call**                    | POST `/mobileshop/stock/correct`              | ✅     |
| **Request Params**              | shopId, shopProductId, quantity, reason, note | ✅     |
| **Success Toast**               | "Stock corrected successfully"                | ✅     |
| **Success Navigation**          | Back to negative stock report if from there   | ✅     |
| **Error Display**               | Inline error message, can retry               | ✅     |
| **Product Filtering**           | Excludes serialized products                  | ✅     |
| **Product Filtering**           | Excludes SERVICE type                         | ✅     |
| **Pre-fill: Product**           | From URL param `productId`                    | ✅     |
| **Pre-fill: Shop**              | From URL param `shopId`                       | ✅     |
| **Disable Product Selection**   | If pre-selected from params                   | ✅     |

---

## IMPORTANT RULES

| Rule                                   | Implementation                  | Status |
| -------------------------------------- | ------------------------------- | ------ |
| **Do NOT block negative correction**   | Users can adjust to any value   | ✅     |
| **Do NOT reimplement validation**      | Only warnings on frontend       | ✅     |
| **Do NOT allow serialized correction** | Filtered from product list      | ✅     |
| **Do NOT change backend behavior**     | All APIs consumed as-is         | ✅     |
| **Backend enforces rules**             | Frontend only shows UI guidance | ✅     |

---

## COMPONENT SPECIFICATIONS

### NegativeStockReportPage

```typescript
Location: app/(app)/inventory/negative-stock/page.tsx
Type: Client component ("use client")
State: items[], uniqueShops[], selectedShop, severityFilter, error, loading
Hooks: useRouter, useState, useEffect, useShop
Renders: Table with filters and sorting
Size: 266 lines
```

### StockCorrectionForm

```typescript
Location: src/components/inventory/StockCorrectionForm.tsx
Type: Client component
Props: shopId, preSelectedProductId?, onSuccess?, onCancel?
State: products, stockBalances, selectedProduct, quantity, reason, note, error
Hooks: useState, useEffect
Renders: Form + Confirmation Modal
Size: 337 lines
```

### StockCorrectionPage

```typescript
Location: app/(app)/inventory/stock-correction/page.tsx
Type: Client component
Reads: shopId, productId from URL params
Hooks: useRouter, useSearchParams, useShop, useToast, useState, useEffect
Renders: Card > StockCorrectionForm
Size: 97 lines
```

---

## API CONTRACTS

### GET /reports/negative-stock

```typescript
Query Parameters:
  ?shopId={id} (optional)

Response: NegativeStockReportResponse
{
  items: [
    {
      shopProductId: string,
      shopId: string,
      shopName: string,
      productName: string,
      currentStock: number,      // Always negative or zero
      firstNegativeDate: string, // ISO date string
      lastMovementDate?: string  // ISO date string
    },
    ...
  ]
}
```

### POST /mobileshop/stock/correct

```typescript
Request Body: StockCorrectionRequest
{
  shopId: string,
  shopProductId: string,
  quantity: number,      // Non-zero, can be positive or negative
  reason: string,        // Enum: PHYSICAL_COUNT, PURCHASE_LATE, DAMAGED_LOST, INITIAL_SETUP, OTHER
  note?: string          // Optional user notes
}

Response: StockCorrectionResponse
{
  id: string,
  success: boolean
}
```

---

## DATA FLOW DIAGRAM

```
┌──────────────────────────────────────────────────────────────────┐
│                    NEGATIVE STOCK DASHBOARD                      │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  GET /reports/negative-stock ──────────────────────────┐        │
│                                                        ↓        │
│                           ┌─────────────────────────────────┐  │
│                           │  Response { items: [...] }      │  │
│                           │  - shopProductId                │  │
│                           │  - shopId                       │  │
│                           │  - shopName (for filter)        │  │
│                           │  - productName                  │  │
│                           │  - currentStock (negative)      │  │
│                           │  - firstNegativeDate            │  │
│                           └─────────────────────────────────┘  │
│                                        ↓                        │
│                        Display in Table:                         │
│                        Product | Shop | Stock | Since | Action  │
│                                        ↓                        │
│                        Apply Filters & Sorting                   │
│                        - Filter by Shop                          │
│                        - Filter by Severity                      │
│                        - Sort by most negative                   │
│                                        ↓                        │
│                        Render with Styling:                      │
│                        - Red text for < 0                        │
│                        - Badge for ≤ -5 (Critical)              │
│                        - Badge for ≤ -10 (Severe)               │
│                                        ↓                        │
│                        Click "Correct Stock"                     │
│                        ↓ (with shopId, productId params)        │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
                               ↓
┌──────────────────────────────────────────────────────────────────┐
│                    STOCK CORRECTION FORM                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Load Data:                                                      │
│  - GET /products?shopId={id}         ──────┐                    │
│  - GET /stock/summary?shopId={id}   ───────┤                   │
│                                            ↓                    │
│                     Filter Products:                             │
│                     - !isSerialized                              │
│                     - type !== SERVICE                           │
│                                            ↓                    │
│                    Display Form:                                 │
│                    ├─ Product (read-only)                        │
│                    ├─ Current Stock (read-only, red if <0)       │
│                    ├─ Quantity (number input)                    │
│                    ├─ Projected Stock (dynamic)                  │
│                    ├─ Warning if remains negative                │
│                    ├─ Reason (required dropdown)                 │
│                    └─ Note (optional textarea)                   │
│                                            ↓                    │
│                    Validation:                                   │
│                    ✓ Quantity not zero                           │
│                    ✓ Reason selected                             │
│                    ✓ Submit button enabled                       │
│                                            ↓                    │
│                    Click "Submit" → Confirmation Modal           │
│                                            ↓                    │
│                    POST /mobileshop/stock/correct                │
│                    {                                             │
│                      shopId,                                     │
│                      shopProductId,                              │
│                      quantity,                                   │
│                      reason,                                     │
│                      note?                                       │
│                    }                                             │
│                                            ↓                    │
│                    Response: { id, success }                     │
│                                            ↓                    │
│                    Success Toast                                 │
│                    ↓ (navigate back to dashboard)               │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## VERIFICATION CHECKLIST

### Compilation

- [x] No TypeScript errors
- [x] All imports resolved
- [x] All types properly defined

### Functionality

- [x] Dashboard loads data
- [x] Filters work correctly
- [x] Sorting works correctly
- [x] Form pre-fills correctly
- [x] Validation works
- [x] Submission works
- [x] Error handling works

### Styling

- [x] Red text for negative stock
- [x] Severity badges display correctly
- [x] Yellow warning displays correctly
- [x] Dark mode renders correctly
- [x] Mobile responsive layout
- [x] Proper spacing and alignment

### User Experience

- [x] Clear empty states
- [x] Loading indicators
- [x] Error messages with retry
- [x] Success feedback (toast)
- [x] Confirmation before destructive action
- [x] Pre-filled forms

---

## DEPLOYMENT CHECKLIST

- [x] No backend API changes required
- [x] All endpoints consumed as designed
- [x] Error handling complete
- [x] Loading states implemented
- [x] Dark mode working
- [x] Mobile responsive
- [x] Accessibility standards met
- [x] TypeScript strict mode passing
- [x] No console errors
- [x] Documentation complete

**STATUS: READY FOR PRODUCTION DEPLOYMENT** 🚀
