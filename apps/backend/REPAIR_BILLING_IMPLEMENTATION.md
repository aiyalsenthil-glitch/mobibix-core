# REPAIR BILLING FLOW - IMPLEMENTATION COMPLETE ✅

## Architecture: READY → DELIVERY → BILL (ATOMIC)

```
RECEIVED (parts issued here)
  ↓
IN_PROGRESS (work happening)
  ↓
READY (technical completion)
  ↓
[POST /repairs/:jobCardId/bill] ← Frontend: Save Bill & Mark Delivered
  ↓
DELIVERED (financial completion, job locked)
```

**Golden Rule**: READY = technical completion | DELIVERED = financial completion

---

## API ENDPOINT

### POST `/repairs/:jobCardId/bill`

Generates repair bill + marks job delivered (atomic transaction).

**Request Body**:

```typescript
{
  "shopId": "shop-123",
  "services": [
    {
      "description": "Repair Service Charge",
      "sacCode": "9987", // Backend overrides this
      "amount": 250
    },
    {
      "description": "Diagnostic Charge",
      "amount": 100
    }
  ],
  "parts": [
    {
      "shopProductId": "prod-456",
      "quantity": 2,
      "rate": 500,
      "gstRate": 18
    }
  ],
  "paymentMode": "CASH", // CASH | UPI | CARD | BANK
  "pricesIncludeTax": false
}
```

**Response** (Invoice):

```typescript
{
  "id": "invoice-xyz",
  "invoiceNumber": "00001",
  "invoiceDate": "2026-01-25T10:30:00Z",
  "customerName": "John Doe",
  "customerPhone": "+919876543210",
  "items": [
    {
      "id": "item-1",
      "hsnCode": "9987",
      "quantity": 1,
      "rate": 250,
      "gstRate": 0,
      "gstAmount": 0,
      "lineTotal": 250
    },
    {
      "id": "item-2",
      "shopProductId": "prod-456",
      "quantity": 2,
      "rate": 500,
      "gstRate": 18,
      "gstAmount": 180,
      "lineTotal": 1180
    }
  ],
  "subTotal": 1430,
  "gstAmount": 180,
  "totalAmount": 1610,
  "paymentMode": "CASH",
  "status": "DELIVERED"
}
```

---

## VALIDATION RULES (ENFORCED)

### ✅ Job Status Validation

- **MUST** be READY to bill
- **BLOCKS** if DELIVERED (no double billing)
- Rejects with: `Job must be in READY status to bill. Current status: {status}`

### ✅ Services Validation

- **REQUIRED**: At least one service (no empty array)
- **SAC Code**: Hardcoded to '9987' (backend truth, frontend display only)
- **GST**: Services typically 0% (SAC 9987 is exempt)

### ✅ Parts Validation (Optional)

- **OPTIONAL**: Parts array can be empty
- **REQUIRED**: Each part must exist in shop
- **TYPE CHECK**: Only SPARE/ACCESSORY allowed (MOBILE blocked)
- **GST**: Respects part-wise GST rates

### ✅ Atomic Operations

Inside `$transaction`:

1. Fetch job + validate status
2. Fetch shop (GST setting)
3. Generate next invoice number
4. Validate parts exist
5. Calculate totals (services + parts + GST)
6. Create invoice + items
7. Create financial entry (IN / JOB reference)
8. Update job → DELIVERED + set finalCost
9. Return invoice

**All or nothing**: If any step fails, entire transaction rolls back.

---

## DATA STRUCTURES

### RepairBillDto

```typescript
{
  jobCardId: string;                    // From URL param (overridden)
  shopId: string;
  services: RepairServiceDto[];         // ✅ Required, non-empty
  parts?: RepairPartDto[];              // ✅ Optional
  paymentMode: PaymentMode;
  pricesIncludeTax?: boolean;           // Metadata only
}
```

### RepairServiceDto

```typescript
{
  description: string;                  // "Repair Service Charge"
  sacCode?: string;                     // Ignored by backend
  amount: number;                       // ₹250
}
```

### RepairPartDto

```typescript
{
  shopProductId: string;
  quantity: number;
  rate: number;
  gstRate: number; // 0, 5, 12, 18
}
```

---

## DATABASE OPERATIONS

### Invoice Creation

```typescript
{
  tenantId,
  shopId,
  customerId: job.customerId,
  invoiceNumber: "00001",
  customerName: job.customerName,
  customerPhone: job.customerPhone,
  subTotal: 1430,
  gstAmount: 180,
  totalAmount: 1610,
  paymentMode: "CASH",
  status: "PAID",
  items: [
    // Service item (SAC 9987)
    {
      shopProductId: shopId,            // Placeholder for services
      quantity: 1,
      rate: 250,
      hsnCode: "9987",
      gstRate: 0,
      gstAmount: 0,
      lineTotal: 250
    },
    // Part item (actual product)
    {
      shopProductId: "prod-456",
      quantity: 2,
      rate: 500,
      hsnCode: "8517",
      gstRate: 18,
      gstAmount: 180,
      lineTotal: 1180
    }
  ]
}
```

### Financial Entry

```typescript
{
  tenantId,
  shopId,
  type: "IN",                           // Income entry
  amount: 1610,                         // Grand total
  mode: "CASH",
  referenceType: "JOB",                 // Links to repair job
  referenceId: jobCardId,
  note: "Repair bill for job {id}"
}
```

### JobCard Update

```typescript
{
  status: "DELIVERED",                  // Marks completion
  finalCost: 1610,                      // Actual billing amount
  updatedAt: new Date()
}
```

---

## KEY FEATURES

### ✅ Service-Only Repair

```json
{
  "services": [
    { "description": "Diagnostic Charge", "amount": 100 },
    { "description": "Labour Charge", "amount": 250 }
  ],
  "parts": []
}
```

✅ Allowed (no parts required)

### ✅ Parts + Service Repair

```json
{
  "services": [{ "description": "Repair Service Charge", "amount": 250 }],
  "parts": [
    { "shopProductId": "prod-123", "quantity": 1, "rate": 500, "gstRate": 18 }
  ]
}
```

✅ Allowed (both tracked separately)

### ✅ Stock Already Handled

- Parts stock-out happens **earlier** via `/stock/out/repair` endpoint
- Billing **does NOT** touch stock ledger again
- `RepairPartUsed` table already has record from earlier stock-out
- Invoice just records what was used (for audit)

### ✅ No Separate "Mark Delivered" API

- ❌ No PUT `/jobs/:id/status` endpoint for DELIVERED
- ✅ Only delivery mechanism: billing endpoint
- Prevents accidental DELIVERED without bill
- Locks job from further editing after DELIVERED

### ✅ Job Locked After DELIVERED

- Update attempts after DELIVERED: **BLOCKED**
- Stock-out after DELIVERED: **BLOCKED**
- Only read operations allowed

---

## ERROR HANDLING

| Scenario              | Status | Message                                                        |
| --------------------- | ------ | -------------------------------------------------------------- |
| Job not found         | 400    | Job card not found                                             |
| Job not READY         | 400    | Job must be in READY status to bill. Current status: {status}  |
| Job already DELIVERED | 400    | Job must be in READY status to bill. Current status: DELIVERED |
| No services           | 400    | At least one service required                                  |
| Shop not found        | 400    | Shop not found                                                 |
| Part not found        | 400    | One or more parts not found                                    |
| Invalid tenant        | 400    | Invalid tenant                                                 |

---

## PRODUCTION CHECKLIST

- ✅ Atomic transaction (all-or-nothing)
- ✅ Job status validation (READY required)
- ✅ SAC code hardcoded (9987, no manual entry)
- ✅ GST calculation (part-wise)
- ✅ Invoice numbering (sequential per shop)
- ✅ Financial entry linked to job
- ✅ Job marked DELIVERED (immutable state)
- ✅ No double billing (DELIVERED blocks)
- ✅ Service-only allowed (no parts required)
- ✅ DTOs validated (class-validator)
- ✅ TypeScript strict mode passing
- ✅ Build verified

---

## SAMPLE CURL REQUEST

```bash
curl -X POST http://localhost_REPLACED:3000/repairs/job-123/bill \
  -H "Authorization: Bearer {jwt_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "shopId": "shop-456",
    "services": [
      {
        "description": "Repair Service Charge",
        "amount": 250
      }
    ],
    "parts": [
      {
        "shopProductId": "prod-789",
        "quantity": 1,
        "rate": 500,
        "gstRate": 18
      }
    ],
    "paymentMode": "CASH"
  }'
```

---

## NEXT: Frontend Integration

**UI Scenario** (from your screenshots):

```
1. Technician marks job READY
2. Admin opens job detail
3. Shows:
   - Device details (from JobCard)
   - Parts used (from RepairPartUsed)
   - Service charges (empty text field)
4. Admin enters:
   - Service description + amount
   - Optional: Parts with rates + GST
5. Clicks "Save Bill & Mark Delivered"
6. POST /repairs/:jobCardId/bill
7. Invoice generated + Job marked DELIVERED
8. Invoice PDF displayed
```

⚠️ **Important**: Do NOT show separate "Mark Delivered" button. Only billing endpoint marks DELIVERED.
