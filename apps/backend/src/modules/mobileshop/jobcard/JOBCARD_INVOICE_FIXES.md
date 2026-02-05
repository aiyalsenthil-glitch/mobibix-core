# JobCard → Invoice Flow Fixes

**Date:** 2026-02-05  
**Scope:** Backend + Frontend guards to enforce PARTS vs SERVICES separation

---

## Problems Fixed

### 1. SERVICE Products Blocked from Parts Flow
- **Backend**: `addPart()` now explicitly rejects SERVICE products with clear error
- **Frontend**: Add Part modal filters out SERVICE products from search results
- **Result**: Services can never be added to parts list

### 2. Stock Operations Via StockService
- **Before**: `addPart()` wrote directly to StockLedger (bypassed validations)
- **After**: Routes through `StockService.recordStockOut()` which enforces:
  - Stock availability checks
  - IMEI validation for serialized products
  - Negative stock prevention
  - Consistent cost tracking
- **Also Fixed**: `removePart()` now uses `StockService.recordStockIn()`

### 3. Invoice Auto-Creation GST Calculation
- **Before**: All `gstAmount` fields set to 0
- **After**: Properly computes GST for:
  - Each part line (uses product.gstRate)
  - Service charge line (18% default or configured rate)
  - Invoice totals (subTotal, gstAmount, totalAmount)
- **Logic**: 
  - If `WITHOUT_GST`: all GST = 0
  - If `WITH_GST`: GST computed per item and aggregated

### 4. Service Charge Separation
- **Before**: "Service Charge" product added as fake part with difference amount
- **After**: 
  - Service charge calculated as: `finalCost - (parts + parts GST)`
  - Added as ONE line item: "Repair Service" (SERVICE type)
  - Never mixed with physical parts
  - GST extracted if applicable (back-calculation from inclusive amount)

### 5. Frontend Stock Field Guards
- **Product Modal**: Stock initialization section hidden when `type === SERVICE`
- **Product Submit**: Stock submission skipped for SERVICE products
- **UX**: Clear UI hints ("Only physical parts shown")

---

## Code Changes

### Backend

**Files Modified:**
- `job-cards.service.ts` - Core business logic
- `job-cards.module.ts` - Added StockModule import

**Key Changes:**
1. Import `StockService` and inject in constructor
2. `addPart()`:
   ```typescript
   if (product.type === ProductType.SERVICE) {
     throw new BadRequestException(
       `"${product.name}" is a service item and cannot be added as a repair part`
     );
   }
   await this.stockService.recordStockOut(...)
   ```

3. `handleJobReady()`:
   ```typescript
   // Compute GST per line
   const lineTaxPaisa = Math.round((lineSubtotalPaisa * gstRate) / 100);
   
   // Service charge = job cost - parts (with tax)
   const serviceChargePaisa = targetTotal - partsWithTax;
   
   // Back-calculate service GST if inclusive
   serviceSubtotal = serviceCharge / (1 + gstRate/100);
   serviceTax = serviceCharge - serviceSubtotal;
   ```

### Frontend

**Files Modified:**
- `ProductModal.tsx` - Hide stock section for SERVICE
- `jobcards/[id]/page.tsx` - Filter SERVICE from Add Part search

**Key Changes:**
1. Conditional render: `{formData.type !== ProductType.SERVICE && (<stock section>)}`
2. Filter products: `all.filter(p => p.type !== ProductType.SERVICE && ...)`
3. UI hint: "Only physical parts shown. Service charges are calculated separately."

---

## Business Rules Enforced

✅ **SERVICE products**:
- Cannot be added to JobCard parts
- Cannot enter stock flows
- Never tracked in inventory
- Appear only as calculated invoice line items

✅ **Stock movements**:
- ALL deductions go through StockService
- Validates availability before deduction
- IMEI requirements checked
- Negative stock prevented

✅ **Invoice creation**:
- Parts listed with individual GST
- Service charge computed as difference
- ONE "Repair Service" line for all service charges
- GST totals correct at DRAFT stage

✅ **UX consistency**:
- Frontend prevents actions backend would reject
- Clear error messages for technicians
- No confusing "service products" in parts lists

---

## Backward Compatibility

- Existing JobCards with SERVICE products in parts will continue to work
- Schema unchanged (no migrations needed)
- Auto-invoice logic handles both old "Service Charge" and new "Repair Service" products
- Stock corrections can still be applied via Inventory module

---

## Verification Checklist

- [ ] Create new JobCard and try adding SERVICE product → Should get error
- [ ] Add physical part → Stock should deduct via StockService
- [ ] Try adding serialized product without IMEI → Should fail
- [ ] Mark job READY → Invoice should have correct GST amounts
- [ ] Check invoice has separate "Repair Service" line
- [ ] Create SERVICE product → Stock fields hidden in UI
- [ ] Old JobCards continue to generate invoices correctly

---

## Related Files

**Backend:**
- `src/core/stock/stock.service.ts` - Centralized stock validation
- `src/modules/mobileshop/jobcard/job-cards.service.ts` - Main logic
- `src/modules/mobileshop/jobcard/job-cards.module.ts` - DI config

**Frontend:**
- `app/(app)/products/ProductModal.tsx` - Product creation
- `app/(app)/jobcards/[id]/page.tsx` - Add Part modal

**Documentation:**
- `SERVICE_PRODUCT_TYPE_SAFETY.md` - Original SERVICE guard docs
- `INVENTORY_IMPLEMENTATION_SUMMARY.md` - Stock system architecture
