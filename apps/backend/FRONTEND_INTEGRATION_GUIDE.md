# Frontend Integration Checklist - Sales API Enhancements

**Status**: Backend API Ready for Integration  
**Date**: January 28, 2026

---

## New API Response Types to Add

Add to `src/services/sales.api.ts`:

```typescript
// Updated list response
export interface InvoiceListResponse {
  invoices: InvoiceListItem[];
  empty: boolean;
  message?: string;
  createShopUrl?: string;
}

export interface InvoiceListItem {
  id: string;
  invoiceNumber: string;
  customerName: string;
  invoiceDate: string | Date;
  totalAmount: number;
  paymentMode: PaymentMode;
  status: InvoiceStatus;

  // ✅ NEW FIELDS
  paidAmount: number;
  balanceAmount: number;
  paymentStatus: 'PAID' | 'PARTIALLY_PAID' | 'UNPAID';
}

// Updated detail response
export interface InvoiceDetailResponse {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  invoiceDate: string | Date;
  customerName: string;
  customerPhone?: string;
  customerGstin?: string;
  customerState?: string;

  subTotal: number;
  gstAmount: number;
  totalAmount: number;
  paymentMode: PaymentMode;

  // ✅ NEW FIELDS
  paidAmount: number;
  balanceAmount: number;
  paymentStatus: 'PAID' | 'PARTIALLY_PAID' | 'UNPAID';

  // ✅ NEW: Payment history
  payments: PaymentHistoryItem[];
  items: InvoiceItemDetail[];
}

export interface PaymentHistoryItem {
  id: string;
  amount: number;
  method: PaymentMode;
  transactionRef?: string;
  receiptNumber: string;
  createdAt: string | Date;
}

// ✅ NEW: Sales summary response
export interface SalesSummaryResponse {
  period: {
    startDate: string | Date;
    endDate: string | Date;
  };
  summary: {
    totalSales: number;
    totalInvoices: number;
    totalReceived: number;
    pendingAmount: number;
  };
  breakdown: {
    cashReceived: number;
    upiReceived: number;
    cardReceived: number;
    bankReceived: number;
  };
}
```

---

## New API Functions to Add

Add to `src/services/sales.api.ts`:

```typescript
/**
 * Get sales summary for a shop within a date range
 * Defaults to current month if no dates provided
 */
export async function getSalesSummary(
  shopId: string,
  startDate?: Date,
  endDate?: Date,
): Promise<SalesSummaryResponse> {
  const params = new URLSearchParams({ shopId });
  if (startDate) params.append('startDate', startDate.toISOString());
  if (endDate) params.append('endDate', endDate.toISOString());

  const response = await authenticatedFetch(
    `/mobileshop/sales/summary?${params.toString()}`,
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch sales summary');
  }

  return response.json();
}
```

---

## UI Components to Update

### 1. Sales List Page

**File**: `app/(app)/sales/page.tsx` or dashboard

**Update**:

```typescript
// Add columns to table
<TableHead>
  <TableRow>
    <TableCell>Invoice #</TableCell>
    <TableCell>Customer</TableCell>
    <TableCell>Total</TableCell>
    <TableCell>Paid</TableCell>          {/* NEW */}
    <TableCell>Balance</TableCell>       {/* NEW */}
    <TableCell>Status</TableCell>        {/* ENHANCED */}
    <TableCell>Date</TableCell>
    <TableCell>Actions</TableCell>
  </TableRow>
</TableHead>

// Show payment status with badge
<TableCell>
  {invoice.paymentStatus === 'PAID' && (
    <Badge variant="success">✅ Paid</Badge>
  )}
  {invoice.paymentStatus === 'PARTIALLY_PAID' && (
    <Badge variant="warning">⏳ Partial: ₹{invoice.balanceAmount}</Badge>
  )}
  {invoice.paymentStatus === 'UNPAID' && (
    <Badge variant="destructive">⚫ Unpaid: ₹{invoice.balanceAmount}</Badge>
  )}
  {invoice.status === 'CANCELLED' && (
    <Badge variant="secondary">Cancelled</Badge>
  )}
</TableCell>
```

---

### 2. Invoice Detail Page

**File**: `app/(app)/sales/{id}/page.tsx`

**Update**:

```typescript
// Show payment summary
<div className="payment-section">
  <h3>Payment Summary</h3>
  <div className="grid grid-cols-3 gap-4">
    <Card>
      <CardTitle>Total Amount</CardTitle>
      <CardValue>₹{invoice.totalAmount}</CardValue>
    </Card>
    <Card>
      <CardTitle>Paid</CardTitle>
      <CardValue>₹{invoice.paidAmount}</CardValue>
    </Card>
    <Card>
      <CardTitle>Pending</CardTitle>
      <CardValue className={invoice.balanceAmount > 0 ? 'text-red-600' : 'text-green-600'}>
        ₹{invoice.balanceAmount}
      </CardValue>
    </Card>
  </div>

  <div className="mt-4">
    <span className="text-sm font-medium">Payment Status:</span>
    {/* Badge based on paymentStatus */}
  </div>
</div>

// Show payment history
<div className="payment-history">
  <h3>Payment History</h3>
  {invoice.payments.length === 0 ? (
    <p className="text-muted">No payments recorded</p>
  ) : (
    <Table>
      <TableHeader>
        <TableRow>
          <TableCell>Date</TableCell>
          <TableCell>Amount</TableCell>
          <TableCell>Method</TableCell>
          <TableCell>Reference</TableCell>
          <TableCell>Receipt #</TableCell>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoice.payments.map(payment => (
          <TableRow key={payment.id}>
            <TableCell>{formatDate(payment.createdAt)}</TableCell>
            <TableCell>₹{payment.amount}</TableCell>
            <TableCell>{payment.method}</TableCell>
            <TableCell>{payment.transactionRef || '-'}</TableCell>
            <TableCell>{payment.receiptNumber}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )}
</div>
```

---

### 3. Dashboard / Summary Widget

**New File**: `app/dashboard/sales-summary/component.tsx`

**Create**:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { getSalesSummary } from '@/services/sales.api';
import { useShop } from '@/context/ShopContext';

export function SalesSummaryWidget() {
  const { selectedShopId } = useShop();
  const [summary, setSummary] = useState<SalesSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedShopId) return;

    const load = async () => {
      try {
        const data = await getSalesSummary(selectedShopId);
        setSummary(data);
      } catch (err) {
        console.error('Failed to load sales summary:', err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [selectedShopId]);

  if (loading) return <div>Loading...</div>;
  if (!summary) return <div>No data</div>;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <SummaryCard
        title="Total Sales"
        value={`₹${summary.summary.totalSales}`}
        subtitle={`${summary.summary.totalInvoices} invoices`}
      />
      <SummaryCard
        title="Cash Received"
        value={`₹${summary.breakdown.cashReceived}`}
        className="text-green-600"
      />
      <SummaryCard
        title="UPI Received"
        value={`₹${summary.breakdown.upiReceived}`}
        className="text-blue-600"
      />
      <SummaryCard
        title="Pending"
        value={`₹${summary.summary.pendingAmount}`}
        className={summary.summary.pendingAmount > 0 ? 'text-orange-600' : 'text-green-600'}
      />
    </div>
  );
}
```

---

## Business Logic Rules to Implement

### 1. Invoice Edit Restrictions

```typescript
const canEditInvoice = (invoice: InvoiceListItem) => {
  // Cannot edit if PAID or CANCELLED
  return invoice.status !== 'PAID' && invoice.status !== 'CANCELLED';
};

// Show warning before edit
if (invoice.status === 'PAID') {
  alert('⚠️ This invoice is fully paid and cannot be edited.');
  return;
}

if (invoice.status === 'CANCELLED') {
  alert('⚠️ This invoice is cancelled and cannot be edited.');
  return;
}

// Show confirmation
if (invoice.paymentStatus === 'PARTIALLY_PAID') {
  const proceed = confirm(
    `⚠️ Editing this invoice may affect:
    • Stock allocations (items will be re-adjusted)
    • Financial entries (payment records may need reversal)
    
    Are you sure you want to continue?`,
  );
  if (!proceed) return;
}
```

### 2. Payment Recording Restrictions

```typescript
const canRecordPayment = (invoice: InvoiceListItem) => {
  // Cannot record if fully paid or cancelled
  return invoice.balanceAmount > 0 && invoice.status !== 'CANCELLED';
};

if (!canRecordPayment(invoice)) {
  alert('⚠️ No pending balance to record payment against.');
  return;
}
```

### 3. Visual Status Indicators

```typescript
const getPaymentStatusBadge = (status: string, balance: number) => {
  switch (status) {
    case 'PAID':
      return <Badge variant="success">✅ Paid</Badge>;
    case 'PARTIALLY_PAID':
      return (
        <Badge variant="warning">
          ⏳ Partial • Pending: ₹{balance}
        </Badge>
      );
    case 'UNPAID':
      return (
        <Badge variant="destructive">
          ⚫ Unpaid • Due: ₹{balance}
        </Badge>
      );
    default:
      return <Badge variant="secondary">Unknown</Badge>;
  }
};
```

---

## Testing Checklist

- [ ] **listInvoices**
  - [ ] Displays all invoices for selected shop
  - [ ] Shows correct paid/balance amounts
  - [ ] Payment status badges display correctly
  - [ ] CANCELLED invoices marked as cancelled
  - [ ] Partially paid invoices show pending amount

- [ ] **getInvoice**
  - [ ] Payment history displays in correct order (newest first)
  - [ ] Payment methods show correctly (CASH, UPI, CARD, BANK)
  - [ ] Transaction references show when available
  - [ ] Receipt numbers display
  - [ ] Paid/balance amounts match list view

- [ ] **getSalesSummary**
  - [ ] Displays total sales for selected period
  - [ ] Shows breakdown by payment method
  - [ ] Pending amount calculated correctly
  - [ ] Default to current month works
  - [ ] Custom date range filtering works
  - [ ] Multiple shops show different data

- [ ] **UI Business Rules**
  - [ ] Cannot edit PAID invoice (button disabled)
  - [ ] Cannot edit CANCELLED invoice (button disabled)
  - [ ] Warning shown when editing PARTIALLY_PAID invoice
  - [ ] Cannot record payment if balanceAmount <= 0
  - [ ] Payment status badges show correct colors

- [ ] **Data Accuracy**
  - [ ] paidAmount = sum of all receipts
  - [ ] balanceAmount = totalAmount - paidAmount
  - [ ] paymentStatus derived correctly
  - [ ] CANCELLED invoices excluded from summary
  - [ ] CANCELLED payments not included in totals

---

## Rollout Plan

1. **Phase 1**: Add type definitions to `sales.api.ts`
2. **Phase 2**: Update sales list component with new columns
3. **Phase 3**: Update invoice detail page with payment history
4. **Phase 4**: Add sales summary dashboard widget
5. **Phase 5**: Implement business logic restrictions
6. **Phase 6**: Test with live data
7. **Phase 7**: Deploy to production

---

## Notes for Developers

- All new fields are optional in responses for backward compatibility
- Use `paymentStatus` for UI logic, not the old `status` field
- Always show pending amount in red if > 0
- Payment history is always newest first
- Date range filtering uses ISO format strings
- Default to current month if no date range provided

---

## Support & Questions

If you encounter any issues:

1. Check that the backend is running (npm run start:dev)
2. Verify the API response format matches the new interfaces
3. Check browser console for API errors
4. Ensure shopId is valid and belongs to tenant
5. Verify authentication token is valid
