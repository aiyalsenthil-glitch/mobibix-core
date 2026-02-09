# REPAIR BILLING - COMPLETE FLOW WITH EXAMPLES

## 🎯 END-TO-END SCENARIO

A customer brings a broken mobile for repair. Here's what happens:

### PHASE 1: RECEPTION (Day 1)

```
POST /jobs/create
{
  "customerName": "John Doe",
  "customerPhone": "+919876543210",
  "deviceType": "Mobile",
  "deviceBrand": "Samsung",
  "deviceModel": "Galaxy S21",
  "deviceSerial": "123ABC456XYZ",
  "customerComplaint": "Screen cracked, not powering on"
}

Response:
{
  "id": "job-001",
  "jobNumber": "JOB-2026-001",
  "status": "RECEIVED",
  "publicToken": "pub_xyz123",
  "createdAt": "2026-01-25T09:00:00Z"
}
```

**Job Status**: `RECEIVED` ✓

---

### PHASE 2: REPAIR WORK (Day 2-3)

**2a. Start Diagnosis**

```
PUT /jobs/job-001
{ "status": "DIAGNOSING" }
```

**Job Status**: `DIAGNOSING` ✓

**2b. Technician Issues Parts**

```
POST /mobileshop/stock/out/repair
{
  "jobCardId": "job-001",
  "shopId": "shop-abc",
  "items": [
    {
      "shopProductId": "prod-screen",
      "quantity": 1
    },
    {
      "shopProductId": "prod-battery",
      "quantity": 1
    }
  ],
  "note": "Screen + battery replacement"
}

Response:
{ "success": true, "entries": 2 }
```

**What happened**:

- ✅ Stock ledger created (OUT entries)
- ✅ RepairPartUsed records created (for billing reference)
- ✅ Parts locked to this job
- ✅ Job status stays DIAGNOSING (not changed by stock-out)

**2c. Continue Work**

```
PUT /jobs/job-001
{ "status": "IN_PROGRESS" }

(Technician works...)

PUT /jobs/job-001
{ "status": "READY" }
```

**Job Status**: `READY` ✓ (Device repaired, tested, ready for delivery)

---

### PHASE 3: BILLING & DELIVERY (Day 4)

**3a. Admin Views Job & Parts**

```
GET /jobs/job-001
{
  "id": "job-001",
  "status": "READY",
  "customerName": "John Doe",
  "customerPhone": "+919876543210",
  "deviceType": "Mobile",
  "deviceBrand": "Samsung",
  "deviceModel": "Galaxy S21",
  "estimatedDelivery": "2026-01-26T18:00:00Z"
}

GET /jobs/job-001/parts-used
[
  {
    "id": "rpu-1",
    "shopProductId": "prod-screen",
    "name": "Mobile Screen",
    "quantity": 1
  },
  {
    "id": "rpu-2",
    "shopProductId": "prod-battery",
    "name": "Mobile Battery",
    "quantity": 1
  }
]
```

**3b. Admin Creates Bill**

```
POST /mobileshop/stock/repairs/job-001/bill
{
  "shopId": "shop-abc",
  "services": [
    {
      "description": "Screen Replacement Service",
      "amount": 500
    },
    {
      "description": "Battery Replacement Service",
      "amount": 300
    }
  ],
  "parts": [
    {
      "shopProductId": "prod-screen",
      "quantity": 1,
      "rate": 2500,
      "gstRate": 12
    },
    {
      "shopProductId": "prod-battery",
      "quantity": 1,
      "rate": 1200,
      "gstRate": 12
    }
  ],
  "paymentMode": "CASH",
  "pricesIncludeTax": false
}
```

**Calculations**:

```
Services Total    = 500 + 300           = 800
Parts Total       = 2500 + 1200         = 3700
Subtotal          = 800 + 3700          = 4500
GST (12% on parts) = (2500 + 1200) * 0.12 = 444
Grand Total       = 4500 + 444          = 4944
```

**3c. Response: Invoice Created & Job Marked DELIVERED**

```
{
  "id": "invoice-00001",
  "invoiceNumber": "00001",
  "invoiceDate": "2026-01-25T14:30:00Z",
  "customerName": "John Doe",
  "customerPhone": "+919876543210",
  "items": [
    {
      "id": "item-1",
      "description": "Screen Replacement Service",
      "hsnCode": "9987",
      "quantity": 1,
      "rate": 500,
      "gstRate": 0,
      "gstAmount": 0,
      "lineTotal": 500
    },
    {
      "id": "item-2",
      "description": "Battery Replacement Service",
      "hsnCode": "9987",
      "quantity": 1,
      "rate": 300,
      "gstRate": 0,
      "gstAmount": 0,
      "lineTotal": 300
    },
    {
      "id": "item-3",
      "shopProductId": "prod-screen",
      "hsnCode": "8517",
      "quantity": 1,
      "rate": 2500,
      "gstRate": 12,
      "gstAmount": 300,
      "lineTotal": 2800
    },
    {
      "id": "item-4",
      "shopProductId": "prod-battery",
      "hsnCode": "8517",
      "quantity": 1,
      "rate": 1200,
      "gstRate": 12,
      "gstAmount": 144,
      "lineTotal": 1344
    }
  ],
  "subTotal": 4500,
  "gstAmount": 444,
  "totalAmount": 4944,
  "paymentMode": "CASH",
  "status": "DELIVERED"
}
```

**What happened atomically**:

1. ✅ Invoice created (4 items: 2 services + 2 parts)
2. ✅ Invoice items created (with GST calculations)
3. ✅ Financial entry created (type: IN, amount: 4944, reference: JOB)
4. ✅ Job status updated to DELIVERED
5. ✅ Job.finalCost set to 4944

**Job Status**: `DELIVERED` 🔒 (NOW LOCKED)

---

### PHASE 4: AFTER DELIVERY (Locked State)

**4a. Attempt to Edit Job → BLOCKED ❌**

```
PUT /jobs/job-001
{ "status": "IN_PROGRESS" }

Error: 400 Bad Request
Message: "Cannot update job that is DELIVERED"
```

**4b. Attempt to Issue More Parts → BLOCKED ❌**

```
POST /mobileshop/stock/out/repair
{
  "jobCardId": "job-001",
  "shopId": "shop-abc",
  "items": [{ "shopProductId": "prod-screen2", "quantity": 1 }]
}

Error: 400 Bad Request
Message: "Cannot issue stock for job in status DELIVERED"
```

**4c. Attempt to Bill Again → BLOCKED ❌**

```
POST /mobileshop/stock/repairs/job-001/bill
{...}

Error: 400 Bad Request
Message: "Job must be in READY status to bill. Current status: DELIVERED"
```

**4d. View Invoice → ✅ ALLOWED**

```
GET /invoices/invoice-00001
{
  "id": "invoice-00001",
  "invoiceNumber": "00001",
  "customerName": "John Doe",
  "totalAmount": 4944,
  "items": [...],
  "status": "PAID",
  "createdAt": "2026-01-25T14:30:00Z"
}
```

**4e. Generate PDF → ✅ ALLOWED**

```
GET /invoices/invoice-00001/pdf
← Returns PDF download
```

**Job Status**: `DELIVERED` 🔒 (Immutable, read-only)

---

## 📊 DATABASE STATE AFTER BILLING

### Jobs Table

```sql
job-001:
  status: 'DELIVERED'
  finalCost: 4944
  updatedAt: 2026-01-25T14:30:00Z
```

### Invoices Table

```sql
invoice-00001:
  invoiceNumber: '00001'
  customerId: 'cust-john'
  customerName: 'John Doe'
  subTotal: 4500
  gstAmount: 444
  totalAmount: 4944
  paymentMode: 'CASH'
  status: 'PAID'
  createdAt: 2026-01-25T14:30:00Z
```

### InvoiceItems Table

```sql
item-1: service, SAC 9987, amount 500, gst 0
item-2: service, SAC 9987, amount 300, gst 0
item-3: part, HSN 8517, amount 2500, gst 300
item-4: part, HSN 8517, amount 1200, gst 144
```

### FinancialEntries Table

```sql
fin-001:
  type: 'IN'
  amount: 4944
  mode: 'CASH'
  referenceType: 'JOB'
  referenceId: 'job-001'
  note: 'Repair bill for job job-001'
  createdAt: 2026-01-25T14:30:00Z
```

### StockLedger Table (from earlier stock-out)

```sql
ledger-1: OUT, prod-screen, qty 1, ref REPAIR, ref-id job-001
ledger-2: OUT, prod-battery, qty 1, ref REPAIR, ref-id job-001
```

### RepairPartUsed Table (from earlier stock-out)

```sql
rpu-1: jobCardId job-001, shopProductId prod-screen, qty 1
rpu-2: jobCardId job-001, shopProductId prod-battery, qty 1
```

---

## 🔄 COMPARISON: WITH vs WITHOUT THIS SYSTEM

### ❌ WITHOUT Repair Billing (Before)

```
Job lifecycle:
RECEIVED → ... → READY
                   ↓
          ??? (How to bill?)
          ??? (What was the cost?)
          ??? (Which parts were used?)
          ??? (Are we tracking income?)

Problems:
- No invoice generation
- No cost tracking
- Duplicate data (manual entry)
- No atomic operations
- Job never marked "complete"
- Income not recorded
```

### ✅ WITH Repair Billing (Now)

```
Job lifecycle:
RECEIVED → ... → READY
                   ↓
            POST /bill
                   ↓
            DELIVERED (Locked)
                   ↓
         Invoice created
         Income recorded
         Job immutable
         All in one atomic transaction

Benefits:
- Automatic invoice generation
- Cost tracking integrated
- Single source of truth
- Atomic all-or-nothing
- Job marked complete
- Financial entry for accounting
- Audit trail complete
```

---

## 🎓 KEY DESIGN PATTERNS

### Pattern 1: State Machine Enforcement

```
READY → [POST /bill] → DELIVERED
  ↑                        ↓
  └────── (no going back)──┘

Job can only move forward, never backward.
Once DELIVERED, forever DELIVERED.
```

### Pattern 2: Atomic Transactions

```javascript
// All steps succeed together or all fail together
$transaction(async (tx) => {
  // 1. Create invoice
  // 2. Create financial entry
  // 3. Update job
  // 4. Return result
  // (If any step fails, entire transaction rolls back)
});
```

### Pattern 3: Immutability After Completion

```
DELIVERED status acts as a "write lock"
├─ No status changes
├─ No stock operations
├─ No financial changes
└─ Read operations only (invoice, PDF, history)
```

### Pattern 4: Multi-Item Billing

```
Single invoice with multiple line types:
├─ Service items (SAC 9987, fixed GST 0%)
└─ Part items (HSN varies, GST varies)

Total = Services + Parts + GST
```

### Pattern 5: Financial Entry Linking

```
Every income source linked back to origin:
├─ Job repair → FinancialEntry.referenceType = 'JOB'
├─ Sale → FinancialEntry.referenceType = 'INVOICE'
└─ Adjustment → FinancialEntry.referenceType = 'ADJUSTMENT'

Enables: Complete audit trail + reconciliation
```

---

## 🧪 COMMON FRONTEND FLOWS

### Flow 1: Simple Service-Only Repair

```
User enters:
- Description: "Screen repair"
- Amount: 500

Backend calculates:
- Services total: 500
- Parts total: 0
- GST: 0
- Grand total: 500

Creates 1 invoice item (service)
```

### Flow 2: Mixed Repair (Service + Parts)

```
User enters:
- Service: "Replacement" (500)
- Part 1: Screen (2500, GST 12%)
- Part 2: Battery (1200, GST 12%)

Backend calculates:
- Services total: 500
- Parts total: 3700
- GST: (2500 + 1200) * 12% = 444
- Grand total: 4644

Creates 3 invoice items:
1. Service (no GST)
2. Screen (with GST)
3. Battery (with GST)
```

### Flow 3: Multiple Services

```
User enters:
- Service 1: "Diagnosis" (100)
- Service 2: "Labour" (250)
- Service 3: "Testing" (50)

Backend calculates:
- Services total: 400
- Parts total: 0
- GST: 0 (services exempt)
- Grand total: 400

Creates 3 invoice items (all services)
```

---

## 🚀 PERFORMANCE NOTES

### Single Transaction

```
Total DB operations: 6 (write-heavy)
1. SELECT job
2. SELECT shop
3. SELECT last invoice (for numbering)
4. SELECT products (parts validation)
5. INSERT invoice
6. INSERT invoice items (N items in one createMany)
7. INSERT financial entry
8. UPDATE job

Time: ~100ms (all in one transaction)
Latency: Network + DB roundtrip
```

### Scalability

```
✅ Invoice numbering: Per-shop (no global lock)
✅ Concurrent requests: Handled by DB (SERIALIZABLE if needed)
✅ Large parts list: Batch creation (createMany)
✅ Multi-tenant: Filtered by tenantId at every query
```

---

## 📋 TESTING CHECKLIST

```typescript
// Test 1: Happy path (service + parts)
✅ POST /repairs/job-001/bill with services + parts
   → Invoice created
   → Job marked DELIVERED
   → FinancialEntry created

// Test 2: Service only
✅ POST /repairs/job-002/bill with services only
   → Works (no parts required)
   → Parts array empty

// Test 3: Job not READY
❌ POST /repairs/job-003/bill (status = IN_PROGRESS)
   → 400 error: "Must be in READY status"

// Test 4: Job already DELIVERED
❌ POST /repairs/job-001/bill (second time)
   → 400 error: "Must be in READY status" (DELIVERED is not READY)

// Test 5: Empty services
❌ POST /repairs/job-004/bill with services: []
   → 400 error: "At least one service required"

// Test 6: Part not found
❌ POST /repairs/job-005/bill with invalid shopProductId
   → 400 error: "One or more parts not found"

// Test 7: GST calculation
✅ POST /repairs/job-006/bill with gstRate 12% on part
   → Correctly calculated: amount * 12 / 100

// Test 8: Invoice numbering
✅ POST /repairs/job-007/bill
   → invoiceNumber = '00001'
✅ POST /repairs/job-008/bill
   → invoiceNumber = '00002'

// Test 9: Concurrent requests
✅ Two simultaneous POST /repairs/.../bill requests
   → Both succeed with different invoice numbers
   → No duplicates, no conflicts

// Test 10: After DELIVERED (immutability)
❌ PUT /jobs/job-001 (status = DELIVERED)
   → Cannot modify
❌ POST /stock/out/repair (jobCardId = job-001)
   → Cannot issue stock
```

---

## 📞 INTEGRATION WITH FRONTEND

### UI Requirements

1. ✅ Show "Save Bill & Mark Delivered" button (only if READY)
2. ✅ Service input form (description + amount)
3. ✅ Parts table (pre-filled from RepairPartUsed)
4. ✅ GST display (per part)
5. ✅ Grand total calculation (real-time)
6. ✅ Disable button after DELIVERED
7. ✅ Show invoice after successful billing

### API Calls Required

```typescript
// 1. Fetch job
GET /jobs/:jobCardId

// 2. Fetch parts used (for pre-fill)
GET /jobs/:jobCardId/parts-used

// 3. Create bill
POST /repairs/:jobCardId/bill

// 4. Generate PDF (optional)
GET /invoices/:invoiceId/pdf
```

### Frontend Validation

```typescript
// Client-side (UX):
- Service description required
- Service amount > 0
- At least 1 service
- Part rate > 0 if parts provided
- Show running total

// Server-side (Security):
- All validations re-checked
- DTOs validated with class-validator
- Business rules enforced in transaction
```

---

**Status**: ✅ COMPLETE  
**Ready for**: Frontend integration + E2E testing
