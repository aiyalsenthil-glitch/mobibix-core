# Sales List Enhancement - Visual Reference

## Table Column Comparison

### Before Enhancement

```
┌─────────────────┬──────────────┬──────────────┬────────┬──────────┬────────┬─────────┐
│ Invoice #       │ Customer     │ Amount       │Payment │ Status   │ Date   │ Actions │
├─────────────────┼──────────────┼──────────────┼────────┼──────────┼────────┼─────────┤
│ INV-001         │ John Smith   │ ₹10,000.00   │ CASH   │ PAID     │ Jan 15 │ 🖨 📤   │
│ INV-002         │ Jane Doe     │ ₹5,000.00    │ UPI    │ CREDIT   │ Jan 14 │ 🖨 📤   │
│ INV-003         │ ABC Corp     │ ₹15,000.00   │ CARD   │ PAID     │ Jan 13 │ 🖨 📤   │
└─────────────────┴──────────────┴──────────────┴────────┴──────────┴────────┴─────────┘

Amount column:
- Shows only total amount
- No payment tracking visible
- Operator must check elsewhere for payment status
```

### After Enhancement

```
┌─────────────────┬──────────────┬────────────────────────┬────────┬──────────────────┬────────┬─────────┐
│ Invoice #       │ Customer     │ Amount                 │Payment │ Status           │ Date   │ Actions │
├─────────────────┼──────────────┼────────────────────────┼────────┼──────────────────┼────────┼─────────┤
│ INV-001         │ John Smith   │ ₹10,000.00 (bold)      │ CASH   │ [🟢 PAID]        │ Jan 15 │ 🖨 📤   │
│                 │              │ Paid: ₹10,000.00       │        │                  │        │         │
│                 │              │ Balance: ₹0.00 (green) │        │                  │        │         │
│ INV-002 ◄────   │ Jane Doe     │ ₹5,000.00 (bold)       │ UPI    │ [🟠 PARTIALLY_P] │ Jan 14 │ 🖨 📤   │
│ (highlighted)   │              │ Paid: ₹2,000.00        │        │                  │        │         │
│                 │              │ Balance: ₹3,000.00 🔴  │        │                  │        │         │
│ INV-003         │ ABC Corp     │ ₹15,000.00 (bold)      │ CARD   │ [🔴 UNPAID]      │ Jan 13 │ 🖨 📤   │
│                 │              │ Paid: ₹0.00            │        │                  │        │         │
│                 │              │ Balance: ₹15,000.00 🔴 │        │                  │        │         │
└─────────────────┴──────────────┴────────────────────────┴────────┴──────────────────┴────────┴─────────┘

Amount column (enhanced):
✓ Total amount bold and prominent
✓ Paid amount shown below
✓ Balance amount with color coding:
  - Green (₹0.00) = Fully paid
  - Red (₹3,000+) = Payment outstanding
✓ Row highlights if balance > 0

Status column (new):
✓ Uses paymentStatus if available (PAID, PARTIALLY_PAID, UNPAID, CANCELLED)
✓ Falls back to invoice.status (PAID, CREDIT, CANCELLED) if not available
✓ Color badges indicate payment state at a glance
```

## Amount Column Layout

### Single Row Details

```
Total Amount Section (in one cell, organized vertically):
┌────────────────────────────┐
│ ₹10,000.00      (font-bold)│  ← Total amount, prominent
│ Paid: ₹5,000.00 (text-xs)  │  ← Secondary info, gray
│ Balance: ₹5,000.00 (red)   │  ← Key info, highlighted
└────────────────────────────┘

Light Mode:
- Container: white
- Total: black, bold
- Paid label: zinc-600, xs
- Balance: red-600 (if > 0) or green-600 (if = 0)

Dark Mode:
- Container: dark slate background
- Total: light gray, bold
- Paid label: stone-400, xs
- Balance: red-400 (if > 0) or green-400 (if = 0)
```

## Row Highlighting

```
Row with Balance Outstanding (light mode):
┌─────────────────────────────────────────────────────────────┐
│ Background: amber-50 (very light amber tint)               │
│ Hover: amber-100/50 (slightly more prominent)              │
│                                                             │
│ INV-002  │ Jane Doe  │ ₹5,000 / Paid ₹2,000 / Balance ₹3k│
│          │           │ (red balance highlights amount)    │
└─────────────────────────────────────────────────────────────┘

Row without Balance (light mode):
┌─────────────────────────────────────────────────────────────┐
│ Background: white                                           │
│ Hover: gray-50 (default hover)                             │
│                                                             │
│ INV-001  │ John Smith│ ₹10,000 / Paid ₹10,000 / Balance ₹0│
│          │           │ (green balance, fully paid)        │
└─────────────────────────────────────────────────────────────┘
```

## Payment Status Badges

### Badge Color Mapping

```
PAID Status:
┌──────────────────┐
│ 🟢 PAID          │
│ bg-green-100     │ Light mode
│ text-green-700   │
│ bg-green-500/15  │ Dark mode
│ text-green-400   │
└──────────────────┘

PARTIALLY_PAID Status:
┌──────────────────────────┐
│ 🟠 PARTIALLY_PAID        │
│ bg-amber-100             │ Light mode
│ text-amber-700           │
│ bg-amber-500/15          │ Dark mode
│ text-amber-400           │
└──────────────────────────┘

UNPAID Status:
┌──────────────────┐
│ 🔴 UNPAID        │
│ bg-red-100       │ Light mode
│ text-red-700     │
│ bg-red-500/15    │ Dark mode
│ text-red-400     │
└──────────────────┘

CANCELLED Status:
┌──────────────────┐
│ ⚪ CANCELLED      │
│ bg-gray-100      │ Light mode
│ text-gray-700    │
│ bg-gray-500/15   │ Dark mode
│ text-gray-400    │
└──────────────────┘
```

## Data Flow

```
Backend API Response
        │
        ▼
┌─────────────────────────────────────────────┐
│ SalesInvoice {                              │
│   id: "inv-123"                             │
│   invoiceNumber: "INV-002"                  │
│   totalAmount: 5000                         │
│   paymentMode: "UPI"                        │
│   status: "CREDIT"                          │
│   paidAmount: 2000          ◄── NEW         │
│   balanceAmount: 3000       ◄── NEW         │
│   paymentStatus: "PARTIALLY_PAID" ◄── NEW   │
│ }                                           │
└─────────────────────────────────────────────┘
        │
        ▼
    Frontend Component
        │
        ├─► Amount Column:
        │   • Shows: ₹5,000 (bold)
        │   • Shows: Paid: ₹2,000
        │   • Shows: Balance: ₹3,000 (red)
        │
        ├─► Payment Mode Badge: [UPI]
        │
        ├─► Status Badge:
        │   • Uses paymentStatus if available
        │   • Shows: [🟠 PARTIALLY_PAID]
        │   • Falls back to status if needed
        │
        └─► Row Highlight:
            • hasBalance = true (balance > 0)
            • Row bg: amber-50 (light) / amber-500/5 (dark)
```

## Responsive Behavior

```
Desktop View:
┌──────────────────────────────────────────────────────┐
│ Horizontal scroll for overflow                       │
│ Amount column expands to show 3 lines of data       │
└──────────────────────────────────────────────────────┘

Tablet/Mobile View:
┌──────────────────────────────────────────────────────┐
│ Horizontal scroll or collapse optional columns       │
│ Amount column maintains 3 lines (compact spacing)    │
│ Swipe actions or expandable rows recommended         │
└──────────────────────────────────────────────────────┘
```

## Component Interaction Example

```typescript
// When invoice has payment info:
{
  totalAmount: 10000,
  paidAmount: 6000,        ← Derived from receipts
  balanceAmount: 4000,     ← Calculated (total - paid)
  paymentStatus: "PARTIALLY_PAID"  ← Derived
}

// UI Rendering:
Amount Cell:
  "₹10,000.00" (bold) → Total
  "Paid: ₹6,000.00" (gray) → Secondary
  "Balance: ₹4,000.00" (red) → Highlighted

Status Badge:
  Shows: "🟠 PARTIALLY_PAID"
  Color: Amber/Orange
  Background: Orange tint

Row Highlight:
  Has balance > 0? YES
  Background: Soft amber (draws attention)
  Hover: Slightly darker amber
```

## Key Features at a Glance

| Feature                    | Benefit                                      |
| -------------------------- | -------------------------------------------- |
| **Enhanced Amount Column** | See total, paid, and balance in one place    |
| **Color-Coded Balance**    | Red = payment needed, Green = fully paid     |
| **Row Highlighting**       | Visually identify invoices needing follow-up |
| **Payment Status Badge**   | New PARTIALLY_PAID and UNPAID states         |
| **Dark Mode Support**      | Consistent colors in both themes             |
| **Backward Compatible**    | Works with or without payment data           |
| **Compact Layout**         | Information dense but readable               |

## Accessibility Features

✅ Color not the only indicator (icons/text labels used)
✅ Sufficient contrast in light and dark modes
✅ Semantic HTML preserved
✅ Keyboard navigable (unchanged from original)
✅ Screen reader friendly (badge text clear)

---

**Result:** Operators can now quickly assess invoice payment status without leaving the list view, improving efficiency and reducing payment tracking errors.
