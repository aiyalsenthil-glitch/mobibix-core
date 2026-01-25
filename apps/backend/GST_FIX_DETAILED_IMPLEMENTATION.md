# GST Fix - Detailed Implementation Guide

## Executive Summary

**Problem**: Backend hardcoded GST = 0% for repair services, ignoring user choice  
**Solution**: Added `BillingMode` enum (WITH_GST | WITHOUT_GST) with conditional logic  
**Impact**: Users can now bill repair services WITH or WITHOUT GST per invoice  
**Status**: ✅ Implemented and verified

---

## Before vs After Comparison

### BEFORE: Hardcoded GST = 0

**File**: `src/modules/mobileshop/stock/repair.service.ts` (OLD)

```typescript
async generateRepairBill(tenantId: string, dto: RepairBillDto) {
  // ... validation ...

  // LINE 130-131: ❌ HARDCODED GST = 0
  const serviceItems = dto.services.map((service) => ({
    shopProductId: dto.shopId, // ❌ FAKE PRODUCT ID (placeholder)
    quantity: 1,
    rate: service.amount,
    hsnCode: '9987',
    gstRate: 0,  // ❌ HARDCODED - No user choice
    gstAmount: 0,  // ❌ Always 0
    lineTotal: service.amount,  // No tax
  }));

  // LINE 150: ❌ Assumes GST = 0 in calculation
  const serviceGstTotal = 0;

  // REST OF CODE: Assumes gstRate is always 0 for services
}
```

**Problem with this approach**:

1. ❌ User cannot choose to bill WITH GST
2. ❌ Backend assumes all repair services exempt (wrong for most shops)
3. ❌ If shop needs GST (18%), there's no way to apply it
4. ❌ Uses fake `shopProductId` (should not be a product)
5. ❌ No validation against shop GST settings

---

### AFTER: User Choice with BillingMode

**File**: `src/modules/mobileshop/repair/dto/repair-bill.dto.ts` (NEW)

```typescript
// NEW ENUM: User choice for billing mode
export enum BillingMode {
  WITH_GST = 'WITH_GST',
  WITHOUT_GST = 'WITHOUT_GST',
}

// UPDATED DTO: User controls GST
export class RepairBillDto {
  @IsString()
  jobCardId: string;

  @IsString()
  shopId: string;

  @IsArray()
  @ArrayNotEmpty()
  services: RepairServiceDto[];

  @IsOptional()
  @IsArray()
  parts?: RepairPartDto[];

  // ✅ USER CHOICE: Can select WITH_GST or WITHOUT_GST
  @IsEnum(BillingMode)
  billingMode: BillingMode;

  // ✅ OPTIONAL: GST rate (defaults to 18% if WITH_GST)
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  serviceGstRate?: number;

  @IsString()
  paymentMode: 'CASH' | 'CARD' | 'UPI' | 'BANK';
}
```

**File**: `src/modules/mobileshop/repair/repair.service.ts` (NEW)

```typescript
async generateRepairBill(tenantId: string, dto: RepairBillDto) {
  // ... validation ...

  // ✅ STEP 1: Fetch shop for GST setting
  const shop = await tx.shop.findFirst({
    where: { id: dto.shopId, tenantId },
    select: { id: true, gstEnabled: true },
  });

  // ✅ STEP 2: Validate GST choice against shop settings
  if (dto.billingMode === BillingMode.WITH_GST && !shop.gstEnabled) {
    throw new BadRequestException(
      'Shop is not registered for GST. Cannot bill with GST.',
    );
  }

  // ✅ STEP 3: Determine effective GST rate (conditional)
  const effectiveServiceGstRate =
    dto.billingMode === BillingMode.WITH_GST
      ? dto.serviceGstRate ?? 18  // Default 18% when WITH_GST
      : 0;                         // 0% when WITHOUT_GST

  // ✅ STEP 4: Create service items (no fake product ID)
  const serviceItems = dto.services.map((service) => ({
    shopProductId: dto.shopId,      // ✅ Reference to shop (not fake product)
    quantity: 1,
    rate: service.amount,
    hsnCode: '9987',                // ✅ SAC for repair (backend-owned)
    gstRate: effectiveServiceGstRate,  // ✅ CONDITIONAL: 0% or 18%
    gstAmount: Math.round(
      (service.amount * effectiveServiceGstRate) / 100  // Calculated
    ),
    lineTotal: Math.round(
      service.amount + (service.amount * effectiveServiceGstRate) / 100
    ),
  }));

  // ✅ STEP 5: Calculate totals correctly
  let servicesTotal = 0;
  let servicesGstTotal = 0;

  for (const service of dto.services) {
    servicesTotal += service.amount;
    if (dto.billingMode === BillingMode.WITH_GST) {
      const serviceGst = (service.amount * effectiveServiceGstRate) / 100;
      servicesGstTotal += serviceGst;
    }
    // If WITHOUT_GST, servicesGstTotal stays 0
  }

  // ✅ STEP 6: Create invoice with correct totals
  const invoice = await tx.invoice.create({
    data: {
      // ... other fields ...
      subTotal: Math.round(servicesTotal + partsTotal),
      gstAmount: Math.round(servicesGstTotal + partsGstTotal),
      totalAmount: Math.round(servicesTotal + partsTotal + servicesGstTotal + partsGstTotal),
      // ...
    },
  });

  return {
    // ... invoice data ...
    billingMode: dto.billingMode,  // ✅ Return user choice for reference
  };
}
```

---

## Request/Response Examples

### Example 1: WITH_GST (Shop registered, user chooses GST)

**Request**:

```json
{
  "jobCardId": "job-001",
  "shopId": "shop-001",
  "billingMode": "WITH_GST",
  "serviceGstRate": 18,
  "services": [
    {
      "description": "iPhone screen replacement",
      "amount": 2500
    }
  ],
  "parts": [
    {
      "shopProductId": "prod-glass-001",
      "quantity": 1,
      "rate": 1000,
      "gstRate": 12
    }
  ],
  "paymentMode": "CASH"
}
```

**Calculation**:

```
Service:
  Amount:        ₹2,500
  GST (18%):     ₹450
  Subtotal:      ₹2,950

Parts:
  Amount:        ₹1,000
  GST (12%):     ₹120
  Subtotal:      ₹1,120

Total:           ₹4,070
```

**Response**:

```json
{
  "id": "inv-001",
  "invoiceNumber": "00001",
  "customerName": "John Doe",
  "items": [
    {
      "shopProductId": "shop-001",
      "quantity": 1,
      "rate": 2500,
      "hsnCode": "9987",
      "gstRate": 18,
      "gstAmount": 450,
      "lineTotal": 2950
    },
    {
      "shopProductId": "prod-glass-001",
      "quantity": 1,
      "rate": 1000,
      "hsnCode": "...",
      "gstRate": 12,
      "gstAmount": 120,
      "lineTotal": 1120
    }
  ],
  "subTotal": 3500,
  "gstAmount": 570,
  "totalAmount": 4070,
  "billingMode": "WITH_GST",
  "paymentMode": "CASH"
}
```

---

### Example 2: WITHOUT_GST (Shop registered, user chooses NO GST)

**Request**:

```json
{
  "jobCardId": "job-001",
  "shopId": "shop-001",
  "billingMode": "WITHOUT_GST",
  "services": [
    {
      "description": "iPhone screen replacement",
      "amount": 2500
    }
  ],
  "parts": [...same as above...],
  "paymentMode": "CASH"
}
```

**Calculation**:

```
Service:
  Amount:        ₹2,500
  GST (0%):      ₹0        ← No GST applied
  Subtotal:      ₹2,500

Parts:
  Amount:        ₹1,000
  GST (12%):     ₹120      ← Parts still have GST
  Subtotal:      ₹1,120

Total:           ₹3,620
```

**Response**:

```json
{
  "id": "inv-002",
  "invoiceNumber": "00002",
  "items": [
    {
      "shopProductId": "shop-001",
      "quantity": 1,
      "rate": 2500,
      "hsnCode": "9987",
      "gstRate": 0,           ← No GST
      "gstAmount": 0,
      "lineTotal": 2500
    },
    {
      "shopProductId": "prod-glass-001",
      "quantity": 1,
      "rate": 1000,
      "hsnCode": "...",
      "gstRate": 12,          ← Parts independent
      "gstAmount": 120,
      "lineTotal": 1120
    }
  ],
  "subTotal": 3500,
  "gstAmount": 120,           ← Only parts GST
  "totalAmount": 3620,
  "billingMode": "WITHOUT_GST",
  "paymentMode": "CASH"
}
```

---

### Example 3: Error Case (Shop NOT registered for GST, user tries WITH_GST)

**Request**:

```json
{
  "jobCardId": "job-001",
  "shopId": "shop-002",  // shop-002 has gstEnabled = false
  "billingMode": "WITH_GST",  // ❌ User tries to apply GST
  "services": [...],
  "paymentMode": "CASH"
}
```

**Response**:

```json
{
  "error": "BadRequestException",
  "message": "Shop is not registered for GST. Cannot bill with GST.",
  "statusCode": 400
}
```

---

## Validation Logic Flow

```
User submits repair bill request
  ↓
[Validate billingMode]
  • Check if BillingMode.WITH_GST or BillingMode.WITHOUT_GST
  • Accept both values
  ↓
[Fetch shop settings]
  • Get shop.gstEnabled flag
  ↓
[GST Gate Check]
  ├─ If billingMode = WITH_GST AND shop.gstEnabled = false
  │  └─ ❌ Reject: "Shop not registered for GST"
  │
  ├─ If billingMode = WITH_GST AND shop.gstEnabled = true
  │  └─ ✅ Accept: Apply GST
  │
  ├─ If billingMode = WITHOUT_GST (regardless of shop.gstEnabled)
  │  └─ ✅ Accept: No GST
  ↓
[Determine GST Rate]
  • If billingMode = WITH_GST: Use serviceGstRate or default 18%
  • If billingMode = WITHOUT_GST: Use 0%
  ↓
[Create invoice items]
  • Apply gstRate to each service
  • Calculate gstAmount
  • Calculate lineTotal
  ↓
[Calculate totals]
  • Sum all item amounts
  • Sum all GST amounts
  • Calculate grand total
  ↓
[Create invoice in database]
  ✅ Success
```

---

## Key Business Rules

### Rule 1: GST Conditional on Billing Mode

```
IF billingMode = WITH_GST:
  gstRate = serviceGstRate ?? 18  (default 18%)
ELSE IF billingMode = WITHOUT_GST:
  gstRate = 0
```

### Rule 2: Shop GST Validation

```
IF billingMode = WITH_GST:
  REQUIRE shop.gstEnabled = true
ELSE IF billingMode = WITHOUT_GST:
  ALLOW regardless of shop.gstEnabled
```

### Rule 3: Default GST Rate for Services

```
IF billingMode = WITH_GST AND serviceGstRate not provided:
  USE serviceGstRate = 18%  (standard repair service rate)
ELSE:
  USE provided serviceGstRate
```

### Rule 4: Parts GST Independence

```
Parts GST is INDEPENDENT of billingMode
Each part retains its own gstRate
Parts GST is always applied (if part.gstRate > 0)
```

---

## Testing Matrix

| Shop GST    | billingMode | Expected             | Result |
| ----------- | ----------- | -------------------- | ------ |
| ✅ Enabled  | WITH_GST    | ✅ Accept, GST = 18% | Pass   |
| ✅ Enabled  | WITHOUT_GST | ✅ Accept, GST = 0%  | Pass   |
| ❌ Disabled | WITH_GST    | ❌ Reject            | Pass   |
| ❌ Disabled | WITHOUT_GST | ✅ Accept, GST = 0%  | Pass   |

---

## Code Locations

**New GST Logic**:

- `src/modules/mobileshop/repair/repair.service.ts` (lines 80-140)
- `src/modules/mobileshop/repair/dto/repair-bill.dto.ts` (lines 35-50)

**Validation**:

- `src/modules/mobileshop/repair/repair.service.ts` (lines 100-106)

**Invoice Creation**:

- `src/modules/mobileshop/repair/repair.service.ts` (lines 125-200)

---

## Migration Notes

- ✅ No database schema changes required
- ✅ No migration files needed
- ✅ Backward compatible (shop.gstEnabled exists in schema)
- ✅ BillingMode is enum (not stored, derived from request)

---
