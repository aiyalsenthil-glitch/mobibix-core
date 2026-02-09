# Stock Correction & Negative Stock Report - Frontend Implementation

## Overview

Owner/Admin inventory management screens for manual stock corrections and negative stock monitoring.

## Features Implemented

### 1. Stock Correction Form Component

**Location**: `src/components/inventory/StockCorrectionForm.tsx`

**Features**:

- Product selector (filters out serialized and SERVICE products automatically)
- Real-time stock display (current stock shown in red if negative)
- Quantity input (positive = add, negative = reduce)
- Reason dropdown with predefined options:
  - Physical count mismatch
  - Purchase entered late
  - Damaged / lost items
  - Initial stock setup
  - Other
- Optional note field
- Projected stock calculation
- Yellow warning banner if stock will remain negative
- Confirmation modal before submission
- Validation: quantity cannot be 0, reason required
- Auto-refresh stock data after successful correction

**Props**:

```typescript
{
  shopId: string;
  preSelectedProductId?: string;  // For deep-linking from negative stock report
  onSuccess?: () => void;
  onCancel?: () => void;
}
```

---

### 2. Stock Correction Page

**Location**: `app/(app)/inventory/stock-correction/page.tsx`

**Features**:

- Standalone page wrapper for StockCorrectionForm
- Reads shopId and productId from URL query params
- Success toast notification
- Navigates back to negative stock report after correction (if coming from there)
- Shop context integration

**URL Pattern**:

```
/inventory/stock-correction?shopId=xxx&productId=yyy
```

---

### 3. Negative Stock Report Page

**Location**: `app/(app)/inventory/negative-stock/page.tsx`

**Features**:

- Table display with columns:
  - Product name
  - Shop name
  - Current Stock (red, monospace font)
  - Negative Since (formatted date)
  - Action button
- Filters:
  - Shop dropdown (All Shops + individual shops)
  - Stock severity:
    - All Negative Stock
    - Moderate (≤ -5)
    - Severe (≤ -10)
- "Correct Stock" button per row → navigates to stock correction page
- Error handling with retry button
- Loading states
- Empty state messages
- Result count display

**URL Pattern**:

```
/inventory/negative-stock
```

---

## API Integration

### New Functions in `src/services/stock.api.ts`

#### `correctStock()`

```typescript
async function correctStock(
  data: StockCorrectionRequest,
): Promise<StockCorrectionResponse>;

interface StockCorrectionRequest {
  shopId: string;
  shopProductId: string;
  quantity: number;
  reason: string;
  note?: string;
}
```

#### `getNegativeStockReport()`

```typescript
async function getNegativeStockReport(
  shopId?: string,
): Promise<NegativeStockReportResponse>;

interface NegativeStockItem {
  shopProductId: string;
  shopId: string;
  shopName: string;
  productName: string;
  currentStock: number;
  firstNegativeDate: string;
}
```

---

## New UI Components

Created the following shadcn-style components:

1. **Select** (`src/components/ui/select.tsx`)
   - Radix UI Select wrapper with Tailwind styling
   - Components: Select, SelectTrigger, SelectContent, SelectItem, SelectValue

2. **Label** (`src/components/ui/label.tsx`)
   - Radix UI Label wrapper for form fields

3. **Textarea** (`src/components/ui/textarea.tsx`)
   - Native textarea with consistent styling

4. **Toast Hook** (`src/hooks/use-toast.ts`)
   - Simple toast notification hook (currently uses alert, ready for upgrade to proper toast library)

---

## Dependencies Added

```bash
npm install @radix-ui/react-select @radix-ui/react-label
```

---

## User Flow

### Scenario 1: Manual Stock Correction

1. Navigate to `/inventory/stock-correction`
2. Select shop (if not already selected)
3. Choose product from dropdown
4. View current stock level
5. Enter adjustment quantity (e.g., -5 to reduce, +10 to add)
6. Select reason from dropdown
7. Optionally add note
8. Click "Submit Correction"
9. Review confirmation modal
10. Confirm → Success toast → Navigate to inventory

### Scenario 2: Fixing Negative Stock

1. Navigate to `/inventory/negative-stock`
2. Apply filters (shop, severity)
3. Review products with negative stock
4. Click "Correct Stock" on specific row
5. → Redirected to correction form with product pre-selected
6. Complete correction
7. → Redirected back to negative stock report

---

## Validation Rules

### Frontend Validation

- Product must be selected
- Quantity cannot be 0
- Quantity must be a valid number
- Reason must be selected
- Submit button disabled during submission

### Backend Validation (from API)

- Product must exist and be active
- Product cannot be SERVICE type
- Product cannot be serialized (IMEI-based flow instead)
- Shop must belong to user's tenant

---

## Error Handling

### Network Errors

- Display error message inline
- Provide "Retry" button for failed requests
- Maintain form state on error

### Backend Errors

- Parse error message from API response
- Display in red banner above form
- Examples:
  - "Product not found"
  - "SERVICE products cannot be corrected"
  - "Use IMEI-based stock correction"

---

## UX Enhancements

### Visual Indicators

- 🔴 Red text for negative stock values
- 🟡 Yellow warning banner for "will remain negative"
- ✅ Green text for positive projected stock
- Monospace font for numeric stock values in table

### Confirmation Modal

- Shows current stock, adjustment, and projected stock
- Color-codes adjustment (green for add, red for reduce)
- Prevents accidental submissions

### Loading States

- "Loading..." text during data fetch
- Disabled inputs during submission
- "Submitting..." button text

---

## Integration with Existing Features

- Uses **ShopContext** for current shop selection
- Integrates with **stock.api** for balance queries
- Leverages **products.api** for product listing
- Follows existing UI component patterns (Button, Card, Table)
- Maintains theme consistency (dark mode support)

---

## Testing Checklist

- [ ] Product selector filters out serialized products
- [ ] Product selector filters out SERVICE type products
- [ ] Current stock displays correctly (red if negative)
- [ ] Quantity validation (cannot be 0)
- [ ] Projected stock calculation accurate
- [ ] Warning banner appears when stock will remain negative
- [ ] Confirmation modal shows correct values
- [ ] Success toast appears after correction
- [ ] Stock data refreshes after correction
- [ ] Shop filter works in negative stock report
- [ ] Severity filter works correctly
- [ ] "Correct Stock" button navigates with correct params
- [ ] Error messages display for backend failures
- [ ] Retry button recovers from network errors

---

## Known Limitations

1. **Toast Implementation**: Currently uses `window.alert()`. Should be upgraded to proper toast library (e.g., sonner, radix-ui/react-toast) for better UX.

2. **Date Formatting**: Uses browser's default locale. Could be improved with explicit timezone/format control.

3. **Pagination**: Negative stock report loads all results. Consider adding pagination for large datasets.

4. **Real-time Updates**: Stock levels don't update in real-time if changed in another tab. Requires manual refresh.

---

## Future Enhancements

1. Add "Last Movement Date" column to negative stock report (requires backend API update)
2. Export negative stock report to CSV/Excel
3. Bulk stock correction (multiple products at once)
4. Stock correction history view (audit log)
5. Email alerts for severe negative stock situations
6. Charts/graphs for stock trends over time
7. Integration with IMEI-based stock correction for serialized products

---

## Related Documentation

- Backend API: `apps/backend/STOCK_CORRECTION_API.md`
- Database Schema: `apps/backend/prisma/schema.prisma` (StockCorrection model)
- Frontend Services: `src/services/stock.api.ts`
