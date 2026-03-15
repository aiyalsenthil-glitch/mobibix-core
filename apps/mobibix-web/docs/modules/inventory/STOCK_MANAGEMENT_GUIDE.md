# Stock Management Features - Complete Guide

## Overview

The stock correction and negative stock reporting system allows inventory managers to manually adjust stock levels, monitor negative inventory, and maintain accurate inventory records.

---

## Features Available

### 1. Manual Stock Correction

**Route**: `/inventory/stock-correction`

Manually adjust inventory for individual products with full audit trail.

**Use Cases**:

- Physical count reveals discrepancies
- Damaged goods need to be written off
- Late entries from purchases or sales
- Initial stock setup

**Workflow**:

```
1. Navigate to Stock Correction page
2. Select shop (context-aware)
3. Choose product (non-serialized, non-SERVICE products)
4. Enter adjustment quantity:
   - Positive = Add stock
   - Negative = Reduce stock
5. Select reason (dropdown)
6. Add optional note
7. Review confirmation modal
8. Confirm adjustment
```

**Validation**:

- ✅ Product must exist and be active
- ✅ Quantity cannot be 0
- ✅ Reason is required
- ✅ Cannot correct SERVICE type products
- ✅ Cannot correct serialized products (use IMEI-based flow)

**UX Enhancements**:

- Real-time stock display (red if negative)
- Yellow warning if stock will remain negative
- Confirmation modal before submission
- Success toast notification
- Auto-refresh stock data

---

### 2. Negative Stock Report

**Route**: `/inventory/negative-stock`

Monitor all products with current negative inventory levels.

**Display**:

- Product name
- Shop name
- Current stock (red, monospace font)
- Date stock first went negative
- "Correct Stock" action button

**Filters**:

- **Shop**: View all shops or filter by specific shop
- **Severity**:
  - All Negative Stock
  - Moderate: Stock ≤ -5
  - Severe: Stock ≤ -10

**Actions**:

- Click "Correct Stock" button → Opens correction form with product pre-filled
- "Manual Stock Correction" header button → New adjustment form

**Smart Features**:

- Shop dropdown populated from actual data
- One-click navigation to correction form
- Error handling with retry option

---

## Backend API

### POST `/mobileshop/stock/correct`

**Purpose**: Submit a manual stock correction

**Authentication**: Required (JWT)

**Request Body**:

```typescript
{
  shopId: string;              // Required
  shopProductId: string;       // Required
  quantity: number;            // Required, cannot be 0
  reason: string;             // Required: PHYSICAL_COUNT | PURCHASE_LATE | DAMAGED_LOST | INITIAL_SETUP | OTHER
  note?: string;              // Optional
}
```

**Response** (200 OK):

```typescript
{
  id: string; // StockCorrection record ID
  success: boolean; // true
}
```

**Error Responses**:

- `400` - Bad Request
  - "Product not found"
  - "SERVICE products cannot be corrected"
  - "Use IMEI-based stock correction"
  - Validation errors
- `401` - Unauthorized
- `500` - Server error

**Backend Flow**:

1. Validate product exists and is eligible
2. Create StockCorrection audit record
3. Call `StockService.recordStockIn()` or `recordStockOut()`
4. Link ledger entry to correction via `referenceType: 'ADJUSTMENT'`
5. Rollback if ledger operation fails

---

### GET `/reports/negative-stock`

**Purpose**: Get all products with negative stock

**Authentication**: Required (JWT)

**Query Parameters**:

- `shopId` (optional): Filter by specific shop

**Response** (200 OK):

```typescript
{
  items: [
    {
      shopProductId: string;
      shopId: string;
      shopName: string;           // ← Now included from backend!
      productName: string;
      currentStock: number;       // Negative value
      firstNegativeDate: string;  // ISO datetime
      lastMovementDate?: Date;    // Last stock ledger entry
    }
  ]
}
```

**Calculation Logic**:

- Iterates StockLedger entries chronologically
- Accumulates stock: SUM(IN quantities) - SUM(OUT quantities)
- Captures `firstNegativeDate` when balance transitions below 0
- Filters out: serialized products, SERVICE products

**Performance**:

- O(n) where n = total ledger entries for tenant
- Consider pagination for tenants with large datasets

---

## Database Schema

### StockCorrection Table

```sql
CREATE TABLE stock_corrections (
  id              CUID PRIMARY KEY,
  tenantId        FK → Tenant,
  shopId          FK → Shop,
  shopProductId   FK → ShopProduct,
  quantity        INT (positive or negative),
  reason          VARCHAR (e.g., 'PHYSICAL_COUNT'),
  note            VARCHAR (optional),
  createdBy       VARCHAR (user ID, nullable),
  createdAt       TIMESTAMP DEFAULT now(),

  INDEXES:
  - [tenantId, createdAt] for audit queries
  - [tenantId, shopId] for shop-specific reports
);
```

### StockLedger Entries

Each stock adjustment creates an entry:

```typescript
{
  shopProductId: "prod123",
  shopId: "shop456",
  type: "IN" | "OUT",           // Based on quantity sign
  quantity: 5,                  // Absolute value
  referenceType: "ADJUSTMENT",
  referenceId: "correction789", // Links to StockCorrection.id
  createdAt: 2026-01-28T...
}
```

---

## Frontend Components

### StockCorrectionForm

**Location**: `src/components/inventory/StockCorrectionForm.tsx`

Reusable form component for stock adjustments.

**Props**:

```typescript
interface StockCorrectionFormProps {
  shopId: string;
  preSelectedProductId?: string; // For deep-linking from negative stock report
  onSuccess?: () => void;
  onCancel?: () => void;
}
```

**Features**:

- Auto-loads products and stock balances
- Filters products (excludes serialized, SERVICE)
- Real-time validation
- Confirmation modal
- Error handling

**Usage**:

```tsx
<StockCorrectionForm
  shopId={selectedShopId}
  preSelectedProductId={productIdFromUrl}
  onSuccess={() => router.push("/inventory")}
  onCancel={() => router.back()}
/>
```

---

## User Workflows

### Scenario 1: Fix Physical Count Discrepancy

```
1. Inventory manager does physical count
2. Finds X units missing (damage, theft, recording error)
3. Goes to /inventory/stock-correction
4. Selects product
5. Enters quantity: -X
6. Selects reason: "Physical count mismatch"
7. Adds note: "Stocktake 2026-01-28"
8. Confirms
9. System updates stock ledger
10. Toast notification confirms success
```

### Scenario 2: Record Late Purchase Entry

```
1. Purchase was forgotten to be entered
2. Physical count now higher than system
3. Difference: +Y units
4. Goes to /inventory/stock-correction
5. Selects product
6. Enters quantity: +Y
7. Selects reason: "Purchase entered late"
8. Adds note: "Invoice #12345 from 2026-01-20"
9. Confirms
10. Stock corrected
```

### Scenario 3: Fix Negative Stock Alert

```
1. Receives alert: Product has -10 units
2. Clicks to investigate
3. Realizes damaged goods write-off was missed
4. Clicks "Correct Stock" in negative stock report
5. → Redirected to correction form with product pre-filled
6. Enters quantity: -10
7. Selects reason: "Damaged / lost items"
8. Adds note: "Water damage - storage area flooding"
9. Confirms
10. Redirected back to negative stock report
11. Product no longer shows as negative
```

---

## Error Handling

### User-Facing Errors

- **"Product not found"** → Product was deleted or invalid
- **"SERVICE products cannot be corrected"** → Use different mechanism
- **"Use IMEI-based stock correction"** → Product is serialized
- **Network error** → Generic retry message with retry button

### Inline Validation

- Quantity validation: Cannot be 0
- Reason validation: Must select from dropdown
- Form submission disabled while saving
- Success toast on completion

### Error Recovery

- Maintain form state on error
- "Retry" button to re-attempt
- Clear error messages guide user actions

---

## Performance Considerations

### Negative Stock Report

- **Query Optimization**: Filters at database level
  - `isSerialized: false`
  - `type: NOT SERVICE`
  - Single `findMany` call to StockLedger
- **Pagination**: Not yet implemented
  - Consider adding if tenant has > 10K ledger entries
- **Shop Name Lookup**: Now included in backend response
  - Eliminates extra `listShops()` call
  - Reduces network round-trips

### Stock Balances

- Calculated on-demand from StockLedger
- No separate stock table (reduces sync issues)
- Can add materialized view if performance needed

---

## Future Enhancements

1. **Bulk Corrections**
   - Excel import for multiple adjustments
   - Batch API endpoint

2. **Advanced Reporting**
   - Stock adjustment history per product
   - Cost impact analysis
   - PDF export with signatures

3. **Automation**
   - Email alerts for severe negative stock (≤ -20)
   - Auto-create corrections from purchase receipts
   - Stock reconciliation suggestions

4. **Integration**
   - Barcode scanning for fast product selection
   - IMEI-based adjustments for serialized products
   - Sync with accounting system for cost adjustments

5. **Analytics**
   - Stock adjustment trends
   - Most frequently adjusted products
   - Damage/loss patterns

---

## Testing Checklist

### Stock Correction Form

- [ ] Product selector only shows non-serialized, non-SERVICE products
- [ ] Current stock displays correctly
- [ ] Stock displays red if negative
- [ ] Quantity input accepts positive and negative
- [ ] Quantity validation rejects 0
- [ ] Reason dropdown shows all 5 options
- [ ] Note field is optional
- [ ] Projected stock calculated accurately
- [ ] Warning shows when stock will remain negative
- [ ] Confirmation modal shows correct values
- [ ] Color-coded adjustment (green for add, red for reduce)
- [ ] Submit disabled while saving
- [ ] Success toast appears
- [ ] Stock data refreshes after correction
- [ ] Error messages display for invalid inputs

### Negative Stock Report

- [ ] Table shows all negative stock products
- [ ] Shop filter works correctly
- [ ] Severity filter ranges accurate
- [ ] "Correct Stock" button navigates with correct productId
- [ ] Correct Stock button opens form with pre-filled product
- [ ] Error state shows retry button
- [ ] Loading state displays
- [ ] Empty state message appears when no negatives
- [ ] Result count updates correctly
- [ ] Shop names display from API (not separate lookup)

### API Integration

- [ ] POST /mobileshop/stock/correct succeeds with valid data
- [ ] GET /reports/negative-stock returns correct format
- [ ] Validation errors return 400 with clear message
- [ ] Unauthorized requests return 401
- [ ] StockLedger entries created with correct referenceType
- [ ] firstNegativeDate captures transition to negative
- [ ] Products filtered correctly (no serialized, no SERVICE)

---

## Troubleshooting

### "Serialized products must be adjusted via IMEI"

- **Issue**: User trying to adjust a product with `isSerialized: true`
- **Solution**: Form prevents quantity input for these products
- **Future**: Implement IMEI-based adjustment flow

### "Stock will remain negative after adjustment"

- **This is a warning, not an error**
- User can proceed if intentional
- System allows negative stock for non-serialized bulk items
- Consider investigation if recurring pattern

### Negative stock report shows no shops

- **Issue**: Unique shops derived from report data
- **Solution**: Must have at least one negative stock item
- **Note**: Empty list if all products are positive

### API returns incomplete shop names

- **Issue**: Backend now includes shop names
- **Solution**: Verify StockLedger.shop select includes name
- **Rollback**: Frontend can use shopId if needed

---

## Related Features

- **Sales Invoice**: Stock warnings when negative during sale
- **Purchase Entry**: Stock increased via purchase ledger
- **IMEI Tracking**: Separate flow for serialized products
- **Stock Ledger**: Single source of truth for all stock movements
- **Audit Trail**: StockCorrection table records all manual adjustments

---

## Configuration

**Environment Variables**: None required (uses existing API URL)

**Feature Flags**: None (always enabled)

**Permissions**: Requires admin/owner role (enforced by JwtAuthGuard)

---

## Support

For issues or questions:

1. Check error message details
2. Review this guide's troubleshooting section
3. Check browser console for network errors
4. Verify backend API is running: `npm run start:dev` in apps/backend
