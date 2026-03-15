# Receipt & Voucher System - Quick Reference

## 🎯 One-Page Summary

| Aspect              | Receipts                               | Vouchers                                                        |
| ------------------- | -------------------------------------- | --------------------------------------------------------------- |
| **Purpose**         | Record money IN from customers         | Record money OUT to suppliers/expenses                          |
| **API Route**       | `/receipts`                            | `/vouchers`                                                     |
| **ID Format**       | `RCP-{timestamp}-{random}`             | `VCH-{timestamp}-{random}`                                      |
| **Types Supported** | CUSTOMER, GENERAL, ADJUSTMENT, PAYMENT | SUPPLIER, EXPENSE, SALARY, ADJUSTMENT                           |
| **Key Field**       | customerName                           | voucherType                                                     |
| **Link To**         | Invoice (optional)                     | Purchase (optional)                                             |
| **Categories**      | N/A                                    | RENT, ELECTRICITY, PHONE, SUPPLIES, MAINTENANCE, DONATION, MISC |
| **CREDIT Handling** | ❌ REJECTED                            | ❌ REJECTED                                                     |
| **Cancellation**    | Soft delete (status = CANCELLED)       | Soft delete (status = CANCELLED)                                |

---

## 🔧 API Quick Reference

### Create Receipt

```bash
POST /api/receipts
Content-Type: application/json
Authorization: Bearer <jwt-token>

{
  "paymentMethod": "CASH",           // CASH, UPI, CARD, BANK (NOT CREDIT)
  "amount": 10000,                   // INR, positive only
  "receiptType": "CUSTOMER",         // CUSTOMER, GENERAL, ADJUSTMENT, PAYMENT
  "customerName": "Raj Kumar",       // Required
  "customerPhone": "9876543210",     // Optional
  "linkedInvoiceId": "inv-123",      // Optional, validates it exists
  "linkedJobId": "job-456",          // Optional, validates it exists
  "narration": "Advance payment",    // Optional
  "transactionRef": "UPI-REF-123"    // Optional (for receipts)
}

Response: 201 Created
{
  "id": "cuid-123",
  "receiptId": "RCP-1234567890-ABCDEF",
  "printNumber": "1",
  "amount": 10000,
  "customerName": "Raj Kumar",
  "status": "ACTIVE",
  "createdAt": "2024-01-15T10:30:00Z",
  "createdBy": "user-123"
}
```

### Create Voucher

```bash
POST /api/vouchers
Content-Type: application/json
Authorization: Bearer <jwt-token>

{
  "paymentMethod": "BANK",           // CASH, UPI, CARD, BANK (NOT CREDIT)
  "amount": 5000,                    // INR, positive only
  "voucherType": "SUPPLIER",         // SUPPLIER, EXPENSE, SALARY, ADJUSTMENT
  "globalSupplierId": "supp-456",    // Optional, required if SUPPLIER type
  "expenseCategory": "RENT",         // Optional (RENT, ELECTRICITY, etc)
  "linkedPurchaseId": "po-789",      // Optional, validates it exists
  "narration": "Monthly rent",       // Optional
  "transactionRef": "TXN-123456789"  // Optional (for vouchers)
}

Response: 201 Created
{
  "id": "cuid-456",
  "voucherId": "VCH-1234567890-XYZPQR",
  "voucherType": "SUPPLIER",
  "amount": 5000,
  "paymentMethod": "BANK",
  "status": "ACTIVE",
  "createdAt": "2024-01-15T10:30:00Z",
  "createdBy": "user-123"
}
```

### List Receipts

```bash
GET /api/receipts?paymentMethod=CASH&status=ACTIVE&startDate=2024-01-01&endDate=2024-01-31&skip=0&take=20

Response: 200 OK
{
  "data": [...],
  "total": 42
}
```

### List Vouchers

```bash
GET /api/vouchers?voucherType=EXPENSE&paymentMethod=BANK&skip=0&take=20

Response: 200 OK
{
  "data": [...],
  "total": 15
}
```

### Cancel Receipt

```bash
POST /api/receipts/{receiptId}/cancel
Content-Type: application/json

{
  "reason": "Customer requested refund - defect found"
}

Response: 200 OK
{
  "id": "cuid-123",
  "status": "CANCELLED",
  "narration": "Original notes [CANCELLED: Customer requested refund - defect found]"
}
```

### Cancel Voucher

```bash
POST /api/vouchers/{voucherId}/cancel
Content-Type: application/json

{
  "reason": "Paid to wrong supplier by mistake"
}

Response: 200 OK
{
  "id": "cuid-456",
  "status": "CANCELLED",
  "narration": "Original notes [CANCELLED: Paid to wrong supplier by mistake]"
}
```

### Get Summary

```bash
GET /api/receipts/summary?startDate=2024-01-01&endDate=2024-01-31

Response: 200 OK
{
  "totalReceipts": 42,
  "totalAmount": 425000,
  "byPaymentMode": {
    "CASH": { "count": 20, "amount": 200000 },
    "UPI": { "count": 15, "amount": 150000 },
    "CARD": { "count": 5, "amount": 50000 },
    "BANK": { "count": 2, "amount": 25000 }
  }
}

GET /api/vouchers/summary?startDate=2024-01-01&endDate=2024-01-31

Response: 200 OK
{
  "totalVouchers": 10,
  "totalAmount": 50000,
  "byVoucherType": {
    "SUPPLIER": { "count": 4, "amount": 30000 },
    "EXPENSE": { "count": 5, "amount": 18000 },
    "SALARY": { "count": 1, "amount": 2000 }
  },
  "byPaymentMode": {
    "BANK": { "count": 6, "amount": 40000 },
    "CASH": { "count": 4, "amount": 10000 }
  }
}
```

---

## ⚠️ CREDIT Rejection Examples

### Attempt to create Receipt with CREDIT

```bash
POST /api/receipts
{
  "paymentMethod": "CREDIT",  // ❌ INVALID
  "amount": 10000,
  "receiptType": "CUSTOMER",
  "customerName": "Raj Kumar"
}

Response: 400 Bad Request
{
  "message": "CREDIT payments do NOT create receipts. Record receipt only when cash/UPI/card/bank payment is received.",
  "error": "Bad Request"
}
```

### Attempt to create Voucher with CREDIT

```bash
POST /api/vouchers
{
  "paymentMethod": "CREDIT",  // ❌ INVALID
  "amount": 5000,
  "voucherType": "SUPPLIER"
}

Response: 400 Bad Request
{
  "message": "CREDIT payments do NOT create vouchers. Record voucher only when cash/UPI/card/bank payment is made.",
  "error": "Bad Request"
}
```

---

## 🖥️ UI Quick Reference

### Receipts Page

- **URL**: `/receipts`
- **Features**:
  - List all receipts with pagination
  - Filter by payment mode (CASH, UPI, CARD, BANK)
  - Filter by status (ACTIVE, CANCELLED)
  - Filter by date range
  - Click receipt ID to view details
  - Cancel button for ACTIVE receipts

### Create Receipt

- **URL**: `/receipts/create`
- **Fields**:
  - Customer Name (required)
  - Amount (required, INR)
  - Payment Method (required, no CREDIT)
  - Customer Phone (optional)
  - Receipt Type (optional)
  - Transaction Ref (optional)
  - Notes (optional)
- **Confirmation**: Shows summary before creating

### Vouchers Page

- **URL**: `/vouchers`
- **Features**:
  - List all vouchers with pagination
  - Filter by payment mode
  - Filter by voucher type
  - Filter by status
  - Filter by date range
  - Click voucher ID to view details
  - Cancel button for ACTIVE vouchers

### Create Voucher

- **URL**: `/vouchers/create`
- **Fields**:
  - Voucher Type (required: SUPPLIER, EXPENSE, SALARY, ADJUSTMENT)
  - Amount (required, INR)
  - Payment Method (required, no CREDIT)
  - Supplier ID (required if SUPPLIER type)
  - Expense Category (optional for EXPENSE type)
  - Transaction Ref (optional)
  - Notes (optional)
- **Confirmation**: Shows summary before creating

---

## 🔐 Validation Rules

| Field                | Receipts                            | Vouchers                            |
| -------------------- | ----------------------------------- | ----------------------------------- |
| **paymentMethod**    | CASH\|UPI\|CARD\|BANK, never CREDIT | CASH\|UPI\|CARD\|BANK, never CREDIT |
| **amount**           | > 0, integer INR                    | > 0, integer INR                    |
| **customerName**     | Required, min 1 char                | N/A                                 |
| **voucherType**      | N/A                                 | Required                            |
| **linkedInvoiceId**  | Must exist in DB                    | N/A                                 |
| **linkedPurchaseId** | N/A                                 | Must exist in DB                    |
| **globalSupplierId** | N/A                                 | Required if voucherType=SUPPLIER    |

---

## 📊 Payment Modes

| Mode       | Receipts    | Vouchers    | Notes                             |
| ---------- | ----------- | ----------- | --------------------------------- |
| CASH       | ✅ Allowed  | ✅ Allowed  | Physical currency                 |
| UPI        | ✅ Allowed  | ✅ Allowed  | Instant transfer                  |
| CARD       | ✅ Allowed  | ✅ Allowed  | Debit/Credit card                 |
| BANK       | ✅ Allowed  | ✅ Allowed  | Bank transfer                     |
| **CREDIT** | ❌ REJECTED | ❌ REJECTED | **Promise to pay - not recorded** |

---

## 🏷️ Receipt Types

| Type       | Use Case                        |
| ---------- | ------------------------------- |
| CUSTOMER   | Payment from customer for sales |
| GENERAL    | General money received          |
| ADJUSTMENT | Adjustment or reversal          |
| PAYMENT    | Payment for advance/deposit     |

---

## 🏷️ Voucher Types

| Type       | Use Case                          | Requires                        |
| ---------- | --------------------------------- | ------------------------------- |
| SUPPLIER   | Payment to supplier               | globalSupplierId                |
| EXPENSE    | Expense payment (rent, utilities) | None (optional expenseCategory) |
| SALARY     | Salary payment to staff           | None                            |
| ADJUSTMENT | Adjustment or reversal            | None                            |

---

## 💰 Expense Categories

| Category    | Use Case                     |
| ----------- | ---------------------------- |
| RENT        | Shop rent, premises lease    |
| ELECTRICITY | EV charges, utilities        |
| PHONE       | Phone bill, internet         |
| SUPPLIES    | Stationery, packaging        |
| MAINTENANCE | Repairs, maintenance         |
| DONATION    | Charitable donations         |
| MISC        | Other miscellaneous expenses |

---

## 🔄 State Diagram

### Receipt States

```
┌─────────┐
│ ACTIVE  │ (Created)
└────┬────┘
     │ Cancel request + reason
     ▼
┌──────────┐
│CANCELLED │ (Soft deleted, not removed)
└──────────┘
```

### Voucher States

```
┌─────────┐
│ ACTIVE  │ (Created)
└────┬────┘
     │ Cancel request + reason
     ▼
┌──────────┐
│CANCELLED │ (Soft deleted, not removed)
└──────────┘
```

---

## 🧮 Amount Handling

- **Always Positive**: System validates amount > 0
- **No Calculations**: Amount is as-is, no derivations
- **No Negative**: Refunds/corrections create new records
- **Currency**: Always INR (₹)
- **No Cents**: Integer amounts only

---

## 📝 Narration/Notes Field

- **Purpose**: Additional context about the transaction
- **On Cancellation**: Original notes preserved + cancellation reason appended
- **Format**: `{original notes} [CANCELLED: {reason}]`
- **Length**: No limit (text field)
- **Optional**: Can be empty

---

## 🔑 Key Design Decisions

1. **CREDIT is Rejected** - Not actual payment, financial reports would be wrong
2. **Soft Delete Only** - Preserves audit trail, maintains historical accuracy
3. **No Calculations** - Daily Entry system handles totals and reconciliation
4. **Source of Truth** - These records are authoritative for financial data
5. **Tenant Isolated** - Multi-tenant support, no cross-tenant data leakage
6. **Fail Loudly** - Explicit validation errors, not silent ignore

---

## 🎯 Typical Daily Entry Integration

**Daily Entry system would:**

1. Read all ACTIVE receipts for given date
2. Group by paymentMethod
3. Sum amounts per payment method
4. Create Daily Entry entries (CASH IN: 100,000, UPI IN: 50,000, etc)

**Then read all ACTIVE vouchers:**

1. Group by paymentMethod
2. Sum amounts per payment method
3. Create Daily Entry entries (CASH OUT: 30,000, BANK OUT: 40,000, etc)

**Result**: Balanced, reconcilable financial records

---

## 🚨 Common Errors

| Error                                    | Cause                             | Solution                                |
| ---------------------------------------- | --------------------------------- | --------------------------------------- |
| "CREDIT payments do NOT create receipts" | Used CREDIT mode                  | Use CASH, UPI, CARD, or BANK            |
| "Receipt amount must be positive"        | amount <= 0                       | Enter amount > 0                        |
| "Customer name is required"              | Empty customerName                | Enter customer name                     |
| "Linked invoice does not exist"          | Invalid linkedInvoiceId           | Use valid invoice ID or leave empty     |
| "Supplier is required for SUPPLIER type" | SUPPLIER voucher without supplier | Add globalSupplierId                    |
| "Voucher already cancelled"              | Trying to cancel twice            | Cannot cancel already cancelled voucher |

---

## 📱 Frontend Components Used

- **Lucide Icons**: Plus, Trash2, AlertCircle, Check, Loader
- **Next.js**: app directory, useRouter, useEffect, useState
- **Tailwind CSS**: Responsive grid, tables, forms
- **TypeScript**: Type-safe API calls and component props

---

## ✨ Best Practices

1. ✅ Always provide reason when cancelling
2. ✅ Link to source documents (invoice/purchase) when available
3. ✅ Use appropriate receipt/voucher types
4. ✅ Add notes for unusual transactions
5. ✅ Review summary reports regularly
6. ✅ Never attempt to create CREDIT receipts/vouchers
7. ✅ Keep transaction references for reconciliation
