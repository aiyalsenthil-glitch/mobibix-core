# Sales List UI Enhancement - Payment Information Display

## Overview

Enhanced the Sales List page to display detailed payment information per invoice, making it easier for shop operators to track invoice payment status at a glance.

## Changes Made

### 1. **API Type Updates** (`src/services/sales.api.ts`)

Added new types and fields to `SalesInvoice`:

```typescript
// New payment status type
export type PaymentStatus = "PAID" | "PARTIALLY_PAID" | "UNPAID" | "CANCELLED";

// Extended SalesInvoice interface with:
- paidAmount?: number;        // Amount already paid
- balanceAmount?: number;     // Remaining amount due
- paymentStatus?: PaymentStatus;  // Derived payment status
```

### 2. **Enhanced Amount Column**

**Before:**

```
₹10,000.00
```

**After:**

```
₹10,000.00  (bold)
Paid: ₹5,000.00  (gray, smaller)
Balance: ₹5,000.00  (red if > 0, green if = 0, smaller)
```

**Features:**

- Total amount displayed in bold
- Paid amount shown below with "Paid:" label
- Balance amount highlighted:
  - Red (`text-red-600` / `dark:text-red-400`) if balance > 0
  - Green (`text-green-600` / `dark:text-green-400`) if balance = 0
- Uses `space-y-1` for compact vertical spacing

### 3. **Smart Row Highlighting**

Rows with outstanding balance (`balanceAmount > 0`) receive subtle background highlight:

**Light Mode:**

- Background: `bg-amber-50` (very light amber)
- Hover: `bg-amber-100/50` (slightly darker)

**Dark Mode:**

- Background: `bg-amber-500/5` (very subtle amber tint)
- Hover: `bg-amber-500/10` (slightly more visible)

**Purpose:** Visual emphasis for invoices requiring follow-up payment without being jarring.

### 4. **Payment Status Badge (New)**

Added `PAYMENT_STATUS_COLORS` color mapping:

```typescript
const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
  PAID: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400",
  PARTIALLY_PAID:
    "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  UNPAID: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  CANCELLED: "bg-gray-100 text-gray-700 dark:bg-gray-500/15 dark:text-gray-400",
};
```

**Logic:**

- Prefers `paymentStatus` if available (from backend)
- Falls back to `status` (PAID | CREDIT | CANCELLED) for backward compatibility
- Display text shows the selected status value

**Color Meanings:**

- **PAID** → Green (payment complete)
- **PARTIALLY_PAID** → Amber (attention needed)
- **UNPAID** → Red (action required)
- **CANCELLED** → Gray (no action needed)

### 5. **Preserved Features**

✅ Payment Mode badges remain unchanged (CASH / UPI / CARD / BANK / CREDIT)
✅ Invoice number, customer name, invoice date all unchanged
✅ All actions (print, share, edit, cancel) remain unchanged
✅ Dark mode support throughout
✅ Responsive table layout maintained

### 6. **Code Structure**

Updated table row rendering to use arrow function (instead of parentheses) for better logic handling:

```typescript
{invoices.map((inv) => {
  // Determine row highlighting
  const hasBalance = inv.balanceAmount && inv.balanceAmount > 0;
  const rowBgClass = hasBalance ? /* amber styles */ : /* default styles */;

  return (
    <tr key={inv.id} className={`transition ${rowBgClass}`}>
      {/* row content */}
    </tr>
  );
})}
```

## Table Layout

| Column     | Content                    | Notes                                              |
| ---------- | -------------------------- | -------------------------------------------------- |
| Invoice #  | Invoice number             | Unchanged                                          |
| Customer   | Customer name              | Unchanged                                          |
| **Amount** | **Total, Paid, Balance**   | **ENHANCED**                                       |
| Payment    | Payment mode badge         | Unchanged (CASH/UPI/CARD/etc)                      |
| **Status** | **Payment status badge**   | **UPDATED** (PAID/PARTIALLY_PAID/UNPAID/CANCELLED) |
| Date       | Invoice date               | Unchanged                                          |
| Actions    | Print, Share, Edit, Cancel | Unchanged                                          |

## Dark Mode Support

All new elements include dark mode variants:

| Element             | Light        | Dark         |
| ------------------- | ------------ | ------------ |
| Amount section text | Gray-600     | Gray-400     |
| Balance (positive)  | Red-600      | Red-400      |
| Balance (zero)      | Green-600    | Green-400    |
| Row highlight       | Amber-50     | Amber-500/5  |
| Row highlight hover | Amber-100/50 | Amber-500/10 |

## Benefits for Shop Operators

1. **Quick Payment Assessment**: See total, paid, and balance in one place
2. **Visual Cues**: Color-coded balance amount and row highlighting
3. **Payment Status Clarity**: New paymentStatus badge shows exact payment state
4. **Compact Display**: Information layered vertically without expanding columns
5. **Easy Follow-up**: Highlighted rows show which invoices need payment attention

## Backward Compatibility

- If backend doesn't return payment fields, UI gracefully handles missing data
- Falls back to original `status` badge if `paymentStatus` not available
- Conditional rendering with `?.balanceAmount !== undefined` checks
- Existing invoice structure fully preserved

## Implementation Notes

### Defensive Programming

```typescript
{inv.paidAmount !== undefined && (
  <div>Paid: ₹{...}</div>
)}
{inv.balanceAmount !== undefined && (
  <div>Balance: ₹{...}</div>
)}
```

### Number Formatting

All amounts use consistent locale formatting:

```typescript
.toLocaleString("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
```

### Conditional Styling

Row background and text colors respond to both `hasBalance` state and theme:

```typescript
const rowBgClass = hasBalance
  ? theme === "dark"
    ? "bg-amber-500/5 hover:bg-amber-500/10"
    : "bg-amber-50 hover:bg-amber-100/50"
  : theme === "dark"
    ? "hover:bg-white/5"
    : "hover:bg-gray-50";
```

## Files Modified

1. **src/services/sales.api.ts**
   - Added `PaymentStatus` type
   - Extended `SalesInvoice` interface

2. **app/(app)/sales/page.tsx**
   - Imported `PaymentStatus` type
   - Added `PAYMENT_STATUS_COLORS` mapping
   - Enhanced Amount column layout
   - Added row highlighting logic
   - Updated Status badge to use payment status when available

## Testing Checklist

- [x] Amount column displays correctly with all three lines
- [x] Balance is red when > 0
- [x] Balance is green when = 0
- [x] Rows with balance > 0 have amber background
- [x] Rows without balance have default background
- [x] Payment status badge shows correct color
- [x] Falls back to invoice status when paymentStatus unavailable
- [x] Dark mode colors display correctly
- [x] Light mode colors display correctly
- [x] Hover effects work on highlighted rows
- [x] Numbers format with proper decimals
- [x] No layout shifts when balance data loads
- [x] All actions (print, share, edit, cancel) still work
- [x] Payment mode badges still display (unchanged)

## Future Enhancements

- [ ] Add payment history column (shows last payment date)
- [ ] Add days overdue indicator for UNPAID invoices
- [ ] Add quick payment entry button for PARTIALLY_PAID invoices
- [ ] Sort by balance amount (show overdue first)
- [ ] Payment reminder badge (e.g., "Due in 2 days")

## Status

✅ **Complete and ready for use**

The Sales List now provides comprehensive payment information at a glance, helping operators quickly identify which invoices need payment attention.
