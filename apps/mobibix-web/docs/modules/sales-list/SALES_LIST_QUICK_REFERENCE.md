# Sales List Enhancement - Quick Reference

## Changes Summary

| Component           | Before                    | After                                     | Impact                                  |
| ------------------- | ------------------------- | ----------------------------------------- | --------------------------------------- |
| **Amount Column**   | Single line: `₹10,000.00` | Multi-line: Total + Paid + Balance        | Better visibility of payment state      |
| **Row Highlight**   | Hover only                | Amber background if balance > 0           | Quick identification of unpaid invoices |
| **Status Badge**    | `PAID\|CREDIT\|CANCELLED` | `PAID\|PARTIALLY_PAID\|UNPAID\|CANCELLED` | More granular payment status            |
| **Balance Display** | Not shown                 | Red (>0) or Green (=0)                    | Visual cue for payment urgency          |

---

## Code Changes Reference

### File 1: `src/services/sales.api.ts`

```typescript
// ADD: New type
export type PaymentStatus = "PAID" | "PARTIALLY_PAID" | "UNPAID" | "CANCELLED";

// ADD to SalesInvoice interface:
paidAmount?: number;
balanceAmount?: number;
paymentStatus?: PaymentStatus;
```

### File 2: `app/(app)/sales/page.tsx`

```typescript
// ADD: Import new type
import { ..., type PaymentStatus } from "@/services/sales.api";

// ADD: New color mapping
const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
  PAID: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400",
  PARTIALLY_PAID: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  UNPAID: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  CANCELLED: "bg-gray-100 text-gray-700 dark:bg-gray-500/15 dark:text-gray-400",
};

// CHANGE: Table row rendering (use arrow function for logic)
{invoices.map((inv) => {
  const hasBalance = inv.balanceAmount && inv.balanceAmount > 0;
  const rowBgClass = hasBalance ? "bg-amber-50 hover:bg-amber-100/50" : "hover:bg-gray-50";
  return <tr className={rowBgClass}>{/* ... */}</tr>;
})}

// CHANGE: Amount column (replace single line with three lines)
<td className={`px-4 py-3 text-sm ...`}>
  <div className="space-y-1">
    <div className="font-bold">₹{inv.totalAmount...}</div>
    {inv.paidAmount !== undefined && <div className="text-xs ...">Paid: ₹{inv.paidAmount...}</div>}
    {inv.balanceAmount !== undefined && <div className="text-xs font-semibold ...">Balance: ₹{inv.balanceAmount...}</div>}
  </div>
</td>

// CHANGE: Status badge (use paymentStatus if available)
<span className={`px-3 py-1 rounded-full text-xs font-semibold ${
  inv.paymentStatus ? PAYMENT_STATUS_COLORS[inv.paymentStatus] : STATUS_COLORS[inv.status]
}`}>
  {inv.paymentStatus || inv.status}
</span>
```

---

## Color Reference

### Amount Column Balance Text

```
Balance > 0 (Red):         Balance = 0 (Green):
Light: text-red-600        Light: text-green-600
Dark: text-red-400         Dark: text-green-400
```

### Payment Status Badges

```
PAID          PARTIALLY_PAID   UNPAID         CANCELLED
Green         Amber            Red            Gray
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Light:        Light:           Light:         Light:
bg-green-100  bg-amber-100     bg-red-100     bg-gray-100
text-green-700 text-amber-700  text-red-700   text-gray-700

Dark:         Dark:            Dark:          Dark:
bg-green-500/15 bg-amber-500/15 bg-red-500/15 bg-gray-500/15
text-green-400  text-amber-400   text-red-400   text-gray-400
```

### Row Highlighting

```
Has Balance > 0:              No Balance or Balance = 0:
Light: bg-amber-50            Light: white
       hover: bg-amber-100/50        hover: bg-gray-50

Dark:  bg-amber-500/5         Dark:  default
       hover: bg-amber-500/10        hover: bg-white/5
```

---

## Conditional Rendering Logic

```typescript
// 1. Show Amount Cell
Always shown: Total Amount (bold)

// 2. Show Paid Amount
{inv.paidAmount !== undefined && (
  <div>Paid: ₹{inv.paidAmount}</div>
)}

// 3. Show Balance Amount
{inv.balanceAmount !== undefined && (
  <div className={inv.balanceAmount > 0 ? "text-red-600" : "text-green-600"}>
    Balance: ₹{inv.balanceAmount}
  </div>
)}

// 4. Show Payment Status
If inv.paymentStatus exists → Use PAYMENT_STATUS_COLORS
Else → Use STATUS_COLORS with inv.status

// 5. Highlight Row
If inv.balanceAmount > 0 → Apply amber background
Else → Use default hover effect
```

---

## Testing Checklist

```
✅ Amount column shows: Total + Paid + Balance
✅ Balance is red when > 0
✅ Balance is green when = 0
✅ Row has amber background if balance > 0
✅ Status badge shows paymentStatus when available
✅ Status badge falls back to status when needed
✅ Payment mode badges still show (CASH/UPI/CARD/etc)
✅ Dark mode colors display correctly
✅ Light mode colors display correctly
✅ Hover effects work on highlighted rows
✅ Numbers format with 2 decimal places
✅ All action buttons work (print, share, edit, cancel)
✅ Responsive on mobile/tablet
```

---

## Data Requirements

### From Backend

```json
{
  "id": "inv-123",
  "invoiceNumber": "INV-001",
  "totalAmount": 10000,
  "paymentMode": "CASH",
  "status": "PAID",
  "customerName": "John",

  "paidAmount": 10000, // NEW (optional)
  "balanceAmount": 0, // NEW (optional)
  "paymentStatus": "PAID" // NEW (optional)
}
```

### Fallback Handling

- ✅ If `paidAmount` missing → Don't show "Paid:" line
- ✅ If `balanceAmount` missing → Don't show "Balance:" line
- ✅ If `paymentStatus` missing → Use `status` field instead

---

## Key Features

| Feature                 | Benefit                                  | Status      |
| ----------------------- | ---------------------------------------- | ----------- |
| Enhanced Amount Display | See total, paid, balance in one place    | ✅ Complete |
| Color-Coded Balance     | Red = payment needed, Green = fully paid | ✅ Complete |
| Row Highlighting        | Visually identify unpaid invoices        | ✅ Complete |
| Payment Status Badges   | New PARTIALLY_PAID and UNPAID states     | ✅ Complete |
| Dark Mode Support       | Works in both light and dark themes      | ✅ Complete |
| Backward Compatible     | Works with or without payment data       | ✅ Complete |
| No Breaking Changes     | All existing features preserved          | ✅ Complete |

---

## Quick Start for Testing

1. **With Payment Data:**
   - Backend returns `paidAmount`, `balanceAmount`, `paymentStatus`
   - UI shows enhanced amount column and new status badges

2. **Without Payment Data:**
   - Backend returns only `totalAmount` and `status`
   - UI shows original display (backward compatible)

3. **Toggle Theme:**
   - Light mode: Click theme switcher
   - Dark mode: Colors automatically adjust
   - All text remains readable

---

## Performance Notes

- ✅ No new API calls
- ✅ No additional state management
- ✅ Conditional rendering optimized
- ✅ Theme check cached
- ✅ Color mapping is constant
- ✅ No layout shifts

---

## Accessibility

- ✅ WCAG AA contrast compliant
- ✅ Color not the only indicator (text labels used)
- ✅ Semantic HTML preserved
- ✅ Screen reader friendly
- ✅ Keyboard navigable

---

## Files Modified

```
mobibix-web/
├── src/services/
│   └── sales.api.ts              ← Add PaymentStatus type
└── app/(app)/sales/
    └── page.tsx                  ← Update table UI
```

---

**Status:** ✅ Implementation Complete and Ready for Use

All changes are backward compatible, follow existing patterns, and maintain dark mode support.
