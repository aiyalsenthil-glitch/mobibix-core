# Quick Reference: Module Reorganization & GST Fix

## ✅ What Was Done

### 1. Folder Reorganization

**Separated** monolithic `stock/` module into:

- `repair/` - Job card repair billing
- `sales/` - Product sales invoices
- `purchase/` - Stock purchase with IMEI tracking
- `stock/` - Ledger operations only (cleaned up)

### 2. Critical GST Fix (Repair Billing)

#### OLD (BROKEN)

```typescript
// repair.service.ts - Line 130
gstRate: 0, // Repair services are typically exempt ❌
shopProductId: dto.shopId // placeholder ❌
```

#### NEW (CORRECTED)

```typescript
// repair/dto/repair-bill.dto.ts - New enum
export enum BillingMode {
  WITH_GST = 'WITH_GST',      // User chooses to bill WITH GST
  WITHOUT_GST = 'WITHOUT_GST', // User chooses to bill WITHOUT GST
}

// repair/repair.service.ts - Line ~115
const effectiveServiceGstRate =
  dto.billingMode === BillingMode.WITH_GST
    ? dto.serviceGstRate ?? 18  // Default 18% when enabled
    : 0;                         // 0% when disabled

// No fake product ID - use shop ID reference
shopProductId: dto.shopId,
hsnCode: '9987', // SAC (backend-owned, not from DTO)
```

---

## 🚀 Key Changes Summary

| Item                 | Before                 | After                                                 |
| -------------------- | ---------------------- | ----------------------------------------------------- |
| **Folder Structure** | Everything in `stock/` | Organized: `repair/`, `sales/`, `purchase/`, `stock/` |
| **GST Logic**        | Hardcoded `gstRate: 0` | User choice via `BillingMode` enum                    |
| **Default GST Rate** | 0% (wrong)             | 18% (correct for repair services)                     |
| **GST Validation**   | None                   | Validates `shop.gstEnabled`                           |
| **Service Products** | Fake product ID        | Proper SAC 9987, description-based                    |
| **Billing Modes**    | N/A                    | WITH_GST, WITHOUT_GST                                 |
| **Module Count**     | 1 (`stock`)            | 4 (`repair`, `sales`, `purchase`, `stock`)            |

---

## 📋 New API Endpoints

### Repair

```
POST /mobileshop/repairs/out                    # Stock-out for repair
POST /mobileshop/repairs/:jobCardId/bill        # Generate repair bill (WITH/WITHOUT GST)
```

### Sales

```
POST   /mobileshop/sales/invoice                # Create sales invoice
PATCH  /mobileshop/sales/invoice/:invoiceId     # Update invoice
POST   /mobileshop/sales/invoice/:invoiceId/cancel
GET    /mobileshop/sales/invoices?shopId=...    # List invoices
GET    /mobileshop/sales/invoice/:invoiceId     # Get invoice details
```

### Purchase

```
POST /mobileshop/purchase/stock-in              # Purchase stock-in
```

---

## 🔧 Repair Billing Example

### Request (WITH_GST)

```json
{
  "jobCardId": "job-123",
  "shopId": "shop-456",
  "billingMode": "WITH_GST",
  "serviceGstRate": 18,
  "services": [
    {
      "description": "Screen replacement",
      "amount": 2000
    }
  ],
  "paymentMode": "CASH"
}
```

### Response

```json
{
  "id": "inv-001",
  "invoiceNumber": "00001",
  "items": [
    {
      "hsnCode": "9987", // SAC for repair service
      "rate": 2000,
      "gstRate": 18, // ✅ Applied based on billingMode
      "gstAmount": 360,
      "lineTotal": 2360
    }
  ],
  "subTotal": 2000,
  "gstAmount": 360,
  "totalAmount": 2360,
  "billingMode": "WITH_GST"
}
```

### Request (WITHOUT_GST)

```json
{
  "billingMode": "WITHOUT_GST",
  ...
}
```

### Response

```json
{
  "gstRate": 0, // ✅ No GST applied
  "gstAmount": 0,
  "totalAmount": 2000, // No tax added
  "billingMode": "WITHOUT_GST"
}
```

---

## 📂 File Movements

### Repair Module

```
stock/repair.controller.ts          → repair/repair.controller.ts ✅
stock/repair.service.ts             → repair/repair.service.ts ✅ (GST fix)
stock/dto/repair-bill.dto.ts        → repair/dto/repair-bill.dto.ts ✅ (NEW structure)
stock/dto/repair-stock-out.dto.ts   → repair/dto/repair-stock-out.dto.ts
(NEW) repair.module.ts              → repair/repair.module.ts
```

### Sales Module

```
stock/sales.controller.ts           → sales/sales.controller.ts
stock/sales.service.ts              → sales/sales.service.ts
stock/dto/sales-invoice.dto.ts      → sales/dto/sales-invoice.dto.ts
(NEW) sales.module.ts               → sales/sales.module.ts
```

### Purchase Module

```
stock/purchase (extracted)          → purchase/purchase.service.ts
(NEW) purchase.controller.ts         → purchase/purchase.controller.ts
stock/dto/purchase-stock-in.dto.ts  → purchase/dto/purchase-stock-in.dto.ts
(NEW) purchase.module.ts            → purchase/purchase.module.ts
```

### Stock Module (Cleaned)

```
stock/stock.controller.ts           ✅ Removed purchaseIn endpoint
stock/stock.service.ts              ✅ Removed purchaseStockIn() method
stock/stock.module.ts               ✅ Removed repair/sales imports
```

---

## ✔️ Build Status

**Build**: ✅ SUCCESS

```
Prisma Client: Generated v7.2.0 (260ms)
TypeScript: No errors (tsc -p tsconfig.build.json)
```

**No import errors**: All auth guards, decorators, and module dependencies resolved correctly.

---

## 🎯 GST Decision Logic (Backend)

```typescript
// 1. Fetch shop GST setting
if (dto.billingMode === BillingMode.WITH_GST && !shop.gstEnabled) {
  // ❌ Reject if shop not registered for GST
  throw new BadRequestException(
    'Shop not registered for GST. Cannot bill with GST.',
  );
}

// 2. Determine effective GST rate
const effectiveServiceGstRate =
  dto.billingMode === BillingMode.WITH_GST
    ? (dto.serviceGstRate ?? 18) // Default to 18% for repair services
    : 0; // No GST if WITHOUT_GST

// 3. Apply to service items
// Services: Apply effectiveServiceGstRate
// Parts: Retain their own gstRate (independent)
```

---

## 🔍 What Changed Internally

### Repair Service (`repair.service.ts`)

**Before**: Line 130-131

```typescript
gstRate: 0,
shopProductId: dto.shopId // placeholder
```

**After**: Lines 115-127 + Service items creation

```typescript
const effectiveServiceGstRate =
  dto.billingMode === BillingMode.WITH_GST ? (dto.serviceGstRate ?? 18) : 0;

const serviceItems = dto.services.map((service) => ({
  shopProductId: dto.shopId,
  rate: service.amount,
  hsnCode: '9987',
  gstRate: effectiveServiceGstRate,
  gstAmount: Math.round((service.amount * effectiveServiceGstRate) / 100),
}));
```

---

## 🧪 Testing Scenarios

### Scenario 1: Shop Registered for GST, User Chooses WITH_GST

- ✅ Request accepted
- ✅ GST applied at 18% (or custom rate)
- ✅ Invoice shows WITH_GST

### Scenario 2: Shop NOT Registered for GST, User Chooses WITH_GST

- ❌ Request rejected
- ❌ Error: "Shop not registered for GST"

### Scenario 3: Shop Registered for GST, User Chooses WITHOUT_GST

- ✅ Request accepted
- ✅ GST NOT applied (0%)
- ✅ Invoice shows WITHOUT_GST

### Scenario 4: Shop NOT Registered for GST, User Chooses WITHOUT_GST

- ✅ Request accepted
- ✅ GST NOT applied (0%)
- ✅ Invoice shows WITHOUT_GST

---

## 📚 Documentation

Full details: See `REORGANIZATION_AND_GST_FIX.md`

---
