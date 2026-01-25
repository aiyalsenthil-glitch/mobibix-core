# REPAIR BILLING - DEVELOPER QUICK REFERENCE

## 🎯 FLOW OVERVIEW

```
Job lifecycle:
RECEIVED → IN_PROGRESS → READY → [Billing] → DELIVERED
                                      ↑
                              POST /repairs/:jobCardId/bill
                              Creates invoice + marks DELIVERED
```

## 📋 FILES CREATED/MODIFIED

| File                                                  | Purpose                                                  |
| ----------------------------------------------------- | -------------------------------------------------------- |
| `src/modules/mobileshop/stock/dto/repair-bill.dto.ts` | ✅ NEW - Request DTOs                                    |
| `src/modules/mobileshop/stock/repair.service.ts`      | Updated - Added `generateRepairBill()` method            |
| `src/modules/mobileshop/stock/repair.controller.ts`   | Updated - Added POST `/repairs/:jobCardId/bill` endpoint |

## 🔧 METHOD SIGNATURE

```typescript
async generateRepairBill(tenantId: string, dto: RepairBillDto): Promise<{
  id: string;
  invoiceNumber: string;
  invoiceDate: Date;
  customerName: string;
  customerPhone: string;
  items: InvoiceItem[];
  subTotal: number;
  gstAmount: number;
  totalAmount: number;
  paymentMode: PaymentMode;
  status: string;
}>
```

## 🚀 ENDPOINT

```
POST /mobileshop/stock/repairs/:jobCardId/bill
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "shopId": "shop-123",
  "services": [
    { "description": "...", "amount": 250 }
  ],
  "parts": [
    { "shopProductId": "...", "quantity": 1, "rate": 500, "gstRate": 18 }
  ],
  "paymentMode": "CASH"
}
```

## ✅ VALIDATION RULES

| Rule               | Enforced                      |
| ------------------ | ----------------------------- |
| Job must be READY  | ✅ YES - rejects otherwise    |
| At least 1 service | ✅ YES - ArrayNotEmpty        |
| Parts optional     | ✅ YES - parts array nullable |
| SAC = 9987         | ✅ YES - backend hardcoded    |
| Service GST = 0%   | ✅ YES - hardcoded            |
| Part GST = custom  | ✅ YES - from DTO             |
| Atomic billing     | ✅ YES - $transaction         |
| Job locked after   | ✅ YES - status = DELIVERED   |

## 🔐 SECURITY

- ✅ Tenant validation
- ✅ Shop ownership check
- ✅ Status enforcement (READY only)
- ✅ No double billing (DELIVERED blocks)
- ✅ Transaction safety (all-or-nothing)

## 📊 DATABASE IMPACT

```
Creates:
  1x Invoice
  N x InvoiceItem (1+ services, 0+ parts)
  1x FinancialEntry (type=IN, ref=JOB)

Updates:
  1x JobCard (status=DELIVERED, finalCost=amount)

Reads:
  1x JobCard
  1x Shop
  N x ShopProduct
  1x Last invoice (for numbering)
```

## 🧪 TEST SCENARIO

```typescript
// 1. Setup: Job is READY
const job = { status: 'READY', customerId, customerName, customerPhone };

// 2. Call billing
const invoice = await repairService.generateRepairBill(tenantId, {
  shopId: 'shop-123',
  jobCardId: 'job-456',
  services: [{ description: 'Repair Service', amount: 250 }],
  parts: [{ shopProductId: 'part-789', quantity: 1, rate: 500, gstRate: 18 }],
  paymentMode: 'CASH',
});

// 3. Verify
expect(invoice.totalAmount).toBe(1360); // 250 + 500 + 90 GST
expect(jobCard.status).toBe('DELIVERED');
expect(financialEntry.referenceType).toBe('JOB');
```

## ⚠️ COMMON MISTAKES (PREVENT)

❌ Calling billing without READY status
✅ Check: `if (job.status !== 'READY') throw BadRequestException`

❌ Empty services array
✅ Check: `@ArrayNotEmpty() on services`

❌ Separate "mark delivered" endpoint
✅ Design: Only billing endpoint marks DELIVERED

❌ SAC code from frontend
✅ Override: Always use '9987' for repair service

❌ Parts stock touched during billing
✅ Design: Stock-out happens earlier, billing is final step

## 📝 LOGS/DEBUGGING

If billing fails, check:

1. Job status = READY?
2. Shop exists?
3. Parts (if any) exist?
4. Tenant + shop ownership?
5. Services array non-empty?
6. Transaction isolation level?

## 🎁 INTEGRATION CHECKLIST

- [ ] Frontend form: services + parts inputs
- [ ] Frontend: Fetch RepairPartUsed for pre-filled parts
- [ ] Frontend: Disable editing after DELIVERED
- [ ] Frontend: Show invoice PDF after billing
- [ ] Backend: Add logging to billing method
- [ ] Backend: Add audit trail for billing changes
- [ ] Backend: Test with different payment modes
- [ ] Backend: Test GST calculations
- [ ] Backend: Test concurrent billing requests
- [ ] Testing: E2E test for repair → billing → DELIVERED flow

## 🔗 RELATED FILES

- [REPAIR_BILLING_IMPLEMENTATION.md](./REPAIR_BILLING_IMPLEMENTATION.md) - Full spec
- [repair.service.ts](./src/modules/mobileshop/stock/repair.service.ts) - Implementation
- [repair.controller.ts](./src/modules/mobileshop/stock/repair.controller.ts) - Endpoints
- [repair-bill.dto.ts](./src/modules/mobileshop/stock/dto/repair-bill.dto.ts) - Input validation
