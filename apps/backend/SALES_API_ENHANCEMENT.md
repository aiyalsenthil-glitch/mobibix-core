# Sales API Enhancement - Payment Tracking & Reporting

**Date**: January 28, 2026  
**Status**: ✅ Complete & Deployed

---

## Overview

Enhanced the sales APIs to provide shop owners with complete payment visibility without changing existing business logic or breaking compatibility.

### What Changed

#### 1. **List Invoices** - Enhanced with Payment Calculations

**Endpoint**: `GET /mobileshop/sales/invoices?shopId={id}`

**New Response Fields**:

```typescript
{
  invoices: [
    {
      id: string,
      invoiceNumber: string,
      customerName: string,
      invoiceDate: Date,
      totalAmount: number,
      paymentMode: string,
      status: 'PAID' | 'CREDIT' | 'CANCELLED',

      // ✅ NEW: Payment tracking
      paidAmount: number,           // Sum of all active receipts
      balanceAmount: number,        // totalAmount - paidAmount
      paymentStatus: 'PAID' | 'PARTIALLY_PAID' | 'UNPAID',
    }
  ],
  empty: boolean,
}
```

**Logic**:

- `paidAmount` = sum of all active receipts linked to invoice
- `balanceAmount` = totalAmount - paidAmount
- `paymentStatus` derived from amounts:
  - **PAID**: balanceAmount <= 0 (fully paid)
  - **PARTIALLY_PAID**: paidAmount > 0 AND balanceAmount > 0
  - **UNPAID**: paidAmount === 0

---

#### 2. **Get Invoice Details** - Enhanced with Payment History

**Endpoint**: `GET /mobileshop/sales/invoice/{invoiceId}`

**New Response Fields**:

```typescript
{
  id: string,
  invoiceNumber: string,
  status: 'PAID' | 'CREDIT' | 'CANCELLED',
  invoiceDate: Date,
  customerName: string,
  customerPhone?: string,
  customerGstin?: string,
  customerState?: string,

  // Financial summary
  subTotal: number,
  gstAmount: number,
  totalAmount: number,
  paymentMode: string,

  // ✅ NEW: Payment summary
  paidAmount: number,
  balanceAmount: number,
  paymentStatus: 'PAID' | 'PARTIALLY_PAID' | 'UNPAID',

  // ✅ NEW: Payment history
  payments: [
    {
      id: string,
      amount: number,
      method: 'CASH' | 'UPI' | 'CARD' | 'BANK',
      transactionRef?: string,
      receiptNumber: string,        // printNumber from Receipt
      createdAt: Date,
    }
  ],

  items: [],  // Item details can be fetched separately if needed
}
```

---

#### 3. **Sales Summary** - NEW Endpoint for Reports

**Endpoint**: `GET /mobileshop/sales/summary`

**Query Parameters**:

- `shopId` (required): Shop ID
- `startDate` (optional): ISO string, defaults to 1st of current month
- `endDate` (optional): ISO string, defaults to last day of current month

**Response**:

```typescript
{
  period: {
    startDate: Date,
    endDate: Date,
  },
  summary: {
    totalSales: number,        // Sum of all invoices (excluding CANCELLED)
    totalInvoices: number,     // Count of invoices
    totalReceived: number,     // Sum of all receipt amounts
    pendingAmount: number,     // totalSales - totalReceived
  },
  breakdown: {
    cashReceived: number,
    upiReceived: number,
    cardReceived: number,
    bankReceived: number,
  },
}
```

**Example Response**:

```json
{
  "period": {
    "startDate": "2026-01-01T00:00:00.000Z",
    "endDate": "2026-01-31T23:59:59.999Z"
  },
  "summary": {
    "totalSales": 50000,
    "totalInvoices": 10,
    "totalReceived": 32000,
    "pendingAmount": 18000
  },
  "breakdown": {
    "cashReceived": 20000,
    "upiReceived": 10000,
    "cardReceived": 2000,
    "bankReceived": 0
  }
}
```

---

## Key Design Decisions

### 1. **No Database Changes**

- All calculations are done at query time
- Uses existing `receipts` relationship and aggregations
- Leverages Prisma's `include()` for efficient data fetching
- CANCELLED invoices excluded from summary by design

### 2. **Payment Status Derivation**

Payment status is calculated on-the-fly:

```typescript
if (balanceAmount <= 0) paymentStatus = 'PAID';
else if (paidAmount > 0) paymentStatus = 'PARTIALLY_PAID';
else paymentStatus = 'UNPAID';
```

This avoids storing duplicate status information and ensures consistency.

### 3. **Receipt Filtering**

- Only `ACTIVE` receipts are counted
- `CANCELLED` receipts are excluded (allows reversal of payments)
- Maintains audit trail without affecting calculations

### 4. **Shop Isolation**

- All endpoints are shop-scoped (via `shopId`)
- Tenant isolation enforced at service level
- Summary can be filtered by date range

---

## Frontend Usage Guide

### TypeScript Interfaces

Add these to your `sales.api.ts`:

```typescript
export interface InvoiceListItem {
  id: string;
  invoiceNumber: string;
  customerName: string;
  invoiceDate: string;
  totalAmount: number;
  paymentMode: PaymentMode;
  status: 'PAID' | 'CREDIT' | 'CANCELLED';
  paidAmount: number;
  balanceAmount: number;
  paymentStatus: 'PAID' | 'PARTIALLY_PAID' | 'UNPAID';
}

export interface InvoiceDetailResponse {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  invoiceDate: string;
  customerName: string;
  customerPhone?: string;
  customerGstin?: string;
  customerState?: string;
  subTotal: number;
  gstAmount: number;
  totalAmount: number;
  paymentMode: PaymentMode;
  paidAmount: number;
  balanceAmount: number;
  paymentStatus: 'PAID' | 'PARTIALLY_PAID' | 'UNPAID';
  payments: {
    id: string;
    amount: number;
    method: PaymentMode;
    transactionRef?: string;
    receiptNumber: string;
    createdAt: string;
  }[];
  items: any[];
}

export interface SalesSummaryResponse {
  period: {
    startDate: string;
    endDate: string;
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

### Example: Fetch and Display Sales List

```typescript
// Fetch list with payment info
const response = await authenticatedFetch(
  `/mobileshop/sales/invoices?shopId=${shopId}`,
);
const { invoices } = await response.json();

// Display with payment status indicators
invoices.forEach((invoice) => {
  if (invoice.paymentStatus === 'UNPAID') {
    console.log(
      `⚠️  ${invoice.invoiceNumber}: ${invoice.balanceAmount} pending`,
    );
  } else if (invoice.paymentStatus === 'PARTIALLY_PAID') {
    console.log(
      `⏳ ${invoice.invoiceNumber}: ${invoice.balanceAmount} pending`,
    );
  } else {
    console.log(`✅ ${invoice.invoiceNumber}: Fully paid`);
  }
});
```

### Example: Show Payment History in Invoice Detail

```typescript
// Fetch full details
const invoice = await getInvoice(invoiceId);

// Display payment timeline
<div className="payment-history">
  <p>Balance: ₹{invoice.balanceAmount}</p>
  <ul>
    {invoice.payments.map(payment => (
      <li key={payment.id}>
        ₹{payment.amount} via {payment.method}
        {payment.transactionRef && ` (Ref: ${payment.transactionRef})`}
        <span>{formatDate(payment.createdAt)}</span>
      </li>
    ))}
  </ul>
</div>
```

### Example: Display Sales Summary in Dashboard

```typescript
// Fetch summary for current month
const response = await authenticatedFetch(
  `/mobileshop/sales/summary?shopId=${shopId}`
);
const summary = await response.json();

// Display dashboard cards
<div className="dashboard-cards">
  <Card title="Total Sales">₹{summary.summary.totalSales}</Card>
  <Card title="Cash Received">₹{summary.breakdown.cashReceived}</Card>
  <Card title="UPI Received">₹{summary.breakdown.upiReceived}</Card>
  <Card title="Pending">₹{summary.summary.pendingAmount}</Card>
</div>
```

---

## UI Business Rules (Implemented in Frontend)

Based on `paymentStatus` and `balanceAmount`:

### 1. **Edit Restrictions**

```typescript
const canEdit = invoice.status !== 'PAID' && invoice.status !== 'CANCELLED';
```

### 2. **Payment Recording**

```typescript
const canRecordPayment =
  invoice.balanceAmount > 0 && invoice.status !== 'CANCELLED';
```

### 3. **Visual Indicators**

```
UNPAID:          ⚫ Gray badge
PARTIALLY_PAID:  🟡 Yellow badge (⏳)
PAID:            🟢 Green badge (✅)
CANCELLED:       ⚫ Gray badge (strike-through)
```

### 4. **Invoice Update Warning**

Before allowing invoice update, show warning:

```
⚠️ Updating this invoice may affect:
   - Stock allocation (items will be re-adjusted)
   - Financial entries (payment records may need reversal)

Are you sure you want to continue?
```

---

## API Examples with cURL

### List invoices with payment info

```bash
curl -H "Authorization: Bearer {token}" \
  "http://localhost_REPLACED:3000/api/mobileshop/sales/invoices?shopId=shop_123"
```

### Get invoice with payment history

```bash
curl -H "Authorization: Bearer {token}" \
  "http://localhost_REPLACED:3000/api/mobileshop/sales/invoice/inv_456"
```

### Get sales summary for current month

```bash
curl -H "Authorization: Bearer {token}" \
  "http://localhost_REPLACED:3000/api/mobileshop/sales/summary?shopId=shop_123"
```

### Get sales summary for date range

```bash
curl -H "Authorization: Bearer {token}" \
  "http://localhost_REPLACED:3000/api/mobileshop/sales/summary?shopId=shop_123&startDate=2026-01-01&endDate=2026-01-31"
```

---

## Testing Checklist

### Backend

- [x] `listInvoices()` returns paidAmount, balanceAmount, paymentStatus
- [x] `getInvoiceDetails()` includes payment history
- [x] `getSalesSummary()` calculates totals correctly
- [x] Payment status logic is correct (PAID, PARTIALLY_PAID, UNPAID)
- [x] Cancelled invoices excluded from summary
- [x] Shop isolation enforced
- [x] Tenant isolation enforced
- [x] Date range filtering works

### Frontend Integration

- [ ] Update `sales.api.ts` with new types
- [ ] Update sales list UI to show payment status badges
- [ ] Update invoice detail page to show payment history
- [ ] Add sales summary dashboard widget
- [ ] Implement edit restrictions based on invoice status
- [ ] Show warning when updating invoice
- [ ] Test with multiple shops
- [ ] Test date range filtering

---

## Backward Compatibility

✅ **Fully backward compatible**:

- Existing fields remain unchanged
- New fields added as extensions
- Existing API contracts honored
- No breaking changes
- Default date range handles missing parameters

---

## Performance Notes

- **listInvoices()**: O(n) where n = invoices in shop (includes 1 receipt lookup per invoice)
- **getInvoiceDetails()**: O(1) with optional O(m) for m receipts
- **getSalesSummary()**: O(n) + O(m) where n = invoices, m = receipts in date range
  - Uses Prisma aggregation (fast)
  - Indexes on `invoiceDate`, `createdAt` recommended
  - Can handle thousands of invoices efficiently

---

## Future Enhancements

Possible improvements without breaking current API:

1. Add `lastPaymentDate` to invoice list
2. Add invoice aging (days overdue) calculation
3. Add customer payment history endpoint
4. Add refund tracking for returned items
5. Add dunning management (payment reminders)
