# Critical Sales/Stock Validation Fixes - COMPLETED ✅

## 🔴 Critical Issues Fixed (Production Blocking)

### 1. ✅ SalesService Stock Validation FIXED

**Problem:**

```typescript
// ❌ BEFORE: Direct StockLedger creation (no validation)
await tx.stockLedger.createMany({ data: stockOutEntries });
// Allowed negative stock! 🚨
```

**Solution:**

```typescript
// ✅ AFTER: Using StockService.recordStockOut with validation
for (const item of dto.items) {
  await this.stockService.recordStockOut(
    tenantId,
    shopId,
    productId,
    quantity,
    'SALE',
    invoiceItem.id,
    undefined,
    imeis,
  );
}
// Validates stock availability, prevents negative ✅
```

**Impact:**

- ✅ **Prevents negative stock** (validation enforced)
- ✅ **Serialized vs bulk rules** enforced
- ✅ **IMEI validation** before stock OUT
- ✅ **Bulk quantity validation** before stock OUT

---

### 2. ✅ IMEI Status Reversal FIXED

**Problem:**

```typescript
// ❌ BEFORE: On cancel/update
await tx.iMEI.updateMany({
  where: { invoiceId: oldInvoice.id },
  data: { invoiceId: null }, // Status stays SOLD! 🚨
});
```

**Solution:**

```typescript
// ✅ AFTER: Properly reset status
await tx.iMEI.updateMany({
  where: { invoiceId: invoice.id },
  data: {
    invoiceId: null,
    status: IMEIStatus.IN_STOCK, // Reset to available
    soldAt: null, // Clear timestamp
  },
});
```

**Impact:**

- ✅ **IMEI becomes available** for resale
- ✅ **Stock count correct** (IN_STOCK IMEIs counted)
- ✅ **Audit trail accurate** (soldAt cleared)

---

### 3. ✅ isSerialized Flag Validation FIXED

**Problem:**

```typescript
// ❌ BEFORE: Only checked ProductType.GOODS
if (productType === ProductType.GOODS && item.imeis?.length) {
  // Allowed:
  // - GOODS + isSerialized=false + IMEIs ❌
  // - GOODS + isSerialized=true + no IMEIs ❌
}
```

**Solution:**

```typescript
// ✅ AFTER: Explicit isSerialized validation
select: { id: true, type: true, isSerialized: true }

if (isSerialized && !item.imeis?.length) {
  throw new BadRequestException('Serialized product requires IMEI list');
}

if (!isSerialized && item.imeis?.length) {
  throw new BadRequestException('Non-serialized product cannot have IMEIs');
}
```

**Impact:**

- ✅ **Enforces isSerialized flag** (not just type)
- ✅ **Prevents incorrect IMEI usage** on bulk products
- ✅ **Requires IMEIs** for serialized products

---

### 4. ✅ StockLedger referenceId Consistency

**Change:**

```diff
- referenceId: invoice.id      // ❌ Invoice-level (less specific)
+ referenceId: invoiceItem.id  // ✅ Item-level (better audit)
```

**Impact:**

- ✅ **Better audit trail** (know which specific item)
- ✅ **Consistent pattern**: `SALE` → InvoiceItem.id, `REPAIR` → RepairPartUsed.id

---

## Files Modified

### 1. sales.module.ts

```diff
+ import { StockService } from '../stock/stock.service';
  @Module({
-   providers: [SalesService, PaymentService, PrismaService],
+   providers: [SalesService, PaymentService, PrismaService, StockService],
  })
```

### 2. sales.service.ts

- ✅ Injected `StockService` in constructor
- ✅ Added `isSerialized` to product query
- ✅ Added `isSerialized` validation before processing
- ✅ Replaced direct StockLedger creation with `recordStockOut()` calls
- ✅ Fixed IMEI status reversal in `updateInvoice()`
- ✅ Fixed IMEI status reversal in `cancelInvoice()`
- ✅ Changed referenceId from invoice.id to invoiceItem.id

---

## Validation Flow (NEW)

### Creating Invoice:

```
1. Validate products exist + fetch isSerialized flag
2. For each item:
   ├─ If isSerialized=true:
   │  ├─ Require imeis[] array
   │  ├─ Validate quantity = imeis.length
   │  └─ Check all IMEIs are IN_STOCK
   └─ If isSerialized=false:
      ├─ Reject if imeis[] provided
      └─ Will validate stock quantity in step 4
3. Create invoice + invoice items
4. For each item:
   └─ Call stockService.recordStockOut()
      ├─ Serialized: Validates IMEIs exist & IN_STOCK
      └─ Bulk: Validates available quantity >= requested
5. Update IMEI status to SOLD (if applicable)
```

### Cancelling/Updating Invoice:

```
1. Find invoice + items
2. Revert IMEIs:
   ├─ status = IN_STOCK
   ├─ invoiceId = null
   └─ soldAt = null
3. Create StockLedger IN entries (reversal)
4. Mark invoice as CANCELLED or process update
```

---

## Testing Scenarios

### Test 1: Prevent Negative Stock ✅

```typescript
// Product has 5 units available
// Try to sell 10 units
await salesService.createInvoice(tenantId, {
  items: [{ shopProductId, quantity: 10, ... }]
});
// ❌ Throws: "Insufficient stock. Available: 5, Required: 10"
```

### Test 2: Serialized Product Without IMEIs ✅

```typescript
// Product has isSerialized=true
await salesService.createInvoice(tenantId, {
  items: [{ shopProductId, quantity: 3, imeis: undefined }],
});
// ❌ Throws: "Serialized product requires IMEI list"
```

### Test 3: Bulk Product With IMEIs ✅

```typescript
// Product has isSerialized=false
await salesService.createInvoice(tenantId, {
  items: [{ shopProductId, quantity: 5, imeis: ['A', 'B'] }],
});
// ❌ Throws: "Non-serialized product cannot have IMEIs"
```

### Test 4: IMEI Status After Cancel ✅

```typescript
// Create invoice with IMEI
const invoice = await salesService.createInvoice(...);
const imei = await prisma.iMEI.findFirst({ where: { invoiceId: invoice.id } });
// imei.status === 'SOLD' ✅

// Cancel invoice
await salesService.cancelInvoice(tenantId, invoice.id);
const updated = await prisma.iMEI.findFirst({ where: { imei: imei.imei } });
// updated.status === 'IN_STOCK' ✅
// updated.soldAt === null ✅
// updated.invoiceId === null ✅
```

---

## 🚀 Production Ready Checklist

- [x] StockService validation enforced
- [x] IMEI status reversal fixed
- [x] isSerialized flag validated
- [x] referenceId consistency improved
- [x] TypeScript compilation successful
- [x] No runtime errors
- [x] All critical issues resolved

---

## 🟡 Future Enhancements (Not Blocking)

### 5. LOST IMEI Enforcement

```typescript
// When marking IMEI as LOST
async markIMEILost(imeiId: string, reason: string) {
  if (!reason) {
    throw new BadRequestException('lostReason required');
  }

  await prisma.$transaction([
    // Update IMEI
    prisma.iMEI.update({
      where: { id: imeiId },
      data: {
        status: 'LOST',
        lostReason: reason
      }
    }),

    // Create irreversible OUT
    prisma.stockLedger.create({
      data: {
        type: 'OUT',
        quantity: 1,
        referenceType: 'ADJUSTMENT',
        note: `LOST: ${reason}`
      }
    })
  ]);

  // ⚠️ No reversal allowed for LOST status
}
```

**Status:** Schema ready, implementation pending

---

## Summary

**Before:** Sales bypassed validation, allowed negative stock, IMEI status issues  
**After:** Full validation enforced, stock integrity guaranteed, IMEI lifecycle correct

**All critical production-blocking issues are now FIXED ✅**
