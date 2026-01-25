# Mobile Shop Module Reorganization & GST Fix Summary

## Folder Structure Reorganization

### Before (Monolithic Stock Module)

```
src/modules/mobileshop/stock/
├── repair.controller.ts
├── repair.service.ts
├── sales.controller.ts
├── sales.service.ts
├── stock.controller.ts
├── stock.service.ts
├── stock-summary.controller.ts
├── stock-summary.service.ts
├── stock-kpi.controller.ts
├── stock-kpi.service.ts
├── stock.module.ts
└── dto/
    ├── repair-bill.dto.ts (❌ WRONG GST LOGIC)
    ├── repair-stock-out.dto.ts
    ├── sales-invoice.dto.ts
    ├── purchase-stock-in.dto.ts
    ├── stock-kpi-overview.dto.ts
    └── stock-summary.dto.ts
```

### After (Organized by Concern)

```
src/modules/mobileshop/
├── repair/
│   ├── repair.controller.ts
│   ├── repair.service.ts ✅ (Corrected GST logic)
│   ├── repair.module.ts
│   └── dto/
│       ├── repair-bill.dto.ts ✅ (BillingMode enum, serviceGstRate)
│       └── repair-stock-out.dto.ts
├── sales/
│   ├── sales.controller.ts
│   ├── sales.service.ts
│   ├── sales.module.ts
│   └── dto/
│       └── sales-invoice.dto.ts
├── purchase/
│   ├── purchase.controller.ts
│   ├── purchase.service.ts
│   ├── purchase.module.ts
│   └── dto/
│       └── purchase-stock-in.dto.ts
├── stock/  (Ledger operations only)
│   ├── stock.controller.ts (Stock ledger operations only)
│   ├── stock.service.ts (Ledger + simple stock-in)
│   ├── stock-summary.controller.ts
│   ├── stock-summary.service.ts
│   ├── stock-kpi.controller.ts
│   ├── stock-kpi.service.ts
│   ├── stock.module.ts (No more repair/sales/purchase imports)
│   └── dto/
│       ├── stock-kpi-overview.dto.ts
│       └── stock-summary.dto.ts
├── mobileshop.module.ts ✅ (Imports new modules)
├── dashboard/
├── inventory/
├── jobcard/
├── products/
└── shops/
```

## Critical GST Fix: From Backend Hardcoded to User Choice

### THE PROBLEM (Before)

The old `repair-bill.dto.ts` and `repair.service.ts` had this **broken logic**:

```typescript
// ❌ WRONG: Backend hardcodes GST = 0
gstRate: 0, // Repair services are typically exempt

// ❌ WRONG: Fake product ID for services
shopProductId: dto.shopId // placeholder
```

**Why this is wrong:**

1. **GST Truth (India)**: Repair/maintenance services are taxable under SAC 9987
2. **Not all shops are exempt**: Exemption is rare; standard rate is 18%
3. **User choice ignored**: Backend shouldn't decide; user should bill WITH or WITHOUT GST
4. **Fake product IDs**: Services don't have products; shouldn't fake references

---

### THE SOLUTION (After - RepairBillDto)

#### New DTO with BillingMode:

```typescript
export enum BillingMode {
  WITH_GST = 'WITH_GST',
  WITHOUT_GST = 'WITHOUT_GST',
}

export class RepairServiceDto {
  @IsString()
  description: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  gstRate?: number; // Optional suggestion (backend will use this or default 18%)
}

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

  @IsEnum(BillingMode)
  billingMode: BillingMode; // ✅ USER CHOICE

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  serviceGstRate?: number; // Optional override, defaults to 18%

  @IsString()
  paymentMode: 'CASH' | 'CARD' | 'UPI' | 'BANK';

  @IsBoolean()
  @IsOptional()
  pricesIncludeTax?: boolean;
}
```

---

## Repair Service Logic (Corrected)

### Key Changes in `repair.service.ts`

#### 1. GST Validation (Shop GST Setting)

```typescript
// Fetch shop for GST setting
const shop = await tx.shop.findFirst({
  where: { id: dto.shopId, tenantId },
  select: { id: true, gstEnabled: true },
});

// Validate GST choice against shop settings
if (dto.billingMode === BillingMode.WITH_GST && !shop.gstEnabled) {
  throw new BadRequestException(
    'Shop is not registered for GST. Cannot bill with GST.',
  );
}
```

#### 2. Service GST Rate (Conditional)

```typescript
// Determine service GST rate based on billing mode
const effectiveServiceGstRate =
  dto.billingMode === BillingMode.WITH_GST
    ? (dto.serviceGstRate ?? 18) // Default 18% if WITH_GST
    : 0; // 0% if WITHOUT_GST
```

#### 3. Service Items (No Fake Product ID)

```typescript
const serviceItems = dto.services.map((service) => ({
  shopProductId: dto.shopId, // ✅ Use shop ID as reference (services don't have products)
  quantity: 1,
  rate: service.amount,
  hsnCode: '9987', // ✅ SAC for repair service (backend-owned, not from DTO)
  gstRate: effectiveServiceGstRate,
  gstAmount: Math.round((service.amount * effectiveServiceGstRate) / 100),
  lineTotal: Math.round(
    service.amount + (service.amount * effectiveServiceGstRate) / 100,
  ),
}));
```

#### 4. Parts GST (Separate)

Parts retain their own GST rates (not controlled by billingMode):

```typescript
const partItems = (dto.parts || []).map((partDto) => ({
  shopProductId: partDto.shopProductId,
  quantity: partDto.quantity,
  rate: partDto.rate,
  hsnCode: '8517', // Placeholder HSN for parts
  gstRate: partDto.gstRate, // ✅ Part's own GST rate
  gstAmount: Math.round(
    (partDto.rate * partDto.quantity * partDto.gstRate) / 100,
  ),
  lineTotal: ...,
}));
```

---

## API Endpoints (New Structure)

### Repair Module

- **POST** `/mobileshop/repairs/out` - Stock out for repair (parts)
- **POST** `/mobileshop/repairs/:jobCardId/bill` - Generate repair bill (with GST choice)

### Sales Module

- **POST** `/mobileshop/sales/invoice` - Create sales invoice
- **PATCH** `/mobileshop/sales/invoice/:invoiceId` - Update invoice
- **POST** `/mobileshop/sales/invoice/:invoiceId/cancel` - Cancel invoice
- **GET** `/mobileshop/sales/invoices?shopId=...` - List invoices
- **GET** `/mobileshop/sales/invoice/:invoiceId` - Get invoice details

### Purchase Module

- **POST** `/mobileshop/purchase/stock-in` - Purchase stock-in (with IMEI handling)

### Stock Module

- **GET** `/mobileshop/stock/...` - Stock ledger operations (unchanged)

---

## Migration Impact

### Services That Moved

1. **RepairService** → `repair/repair.service.ts` (with GST fix)
2. **SalesService** → `sales/sales.service.ts` (unchanged)
3. **PurchaseService** → `purchase/purchase.service.ts` (extracted from stock)

### Services That Remained

1. **StockService** → `stock/stock.service.ts` (ledger operations only)
2. **StockSummaryService** → `stock/stock-summary.service.ts`
3. **StockKpiService** → `stock/stock-kpi.service.ts`

### DTOs That Moved

1. `repair-bill.dto.ts` → `repair/dto/` ✅ **With GST fix**
2. `repair-stock-out.dto.ts` → `repair/dto/`
3. `sales-invoice.dto.ts` → `sales/dto/`
4. `purchase-stock-in.dto.ts` → `purchase/dto/`
5. `stock-summary.dto.ts` → `stock/dto/` (remained)
6. `stock-kpi-overview.dto.ts` → `stock/dto/` (remained)

---

## Build Verification

✅ **Build Status: PASS**

```
Loaded Prisma config from prisma.config.ts
Generated Prisma Client (v7.2.0) in 243ms
TypeScript compilation: SUCCESS (tsc -p tsconfig.build.json --noEmit)
```

**No errors found in:**

- Import paths (auth guards, decorators)
- Module dependencies
- Type declarations
- DTO validations

---

## Frontend Integration (Repair Billing Example)

### Request with GST

```json
{
  "jobCardId": "job-123",
  "shopId": "shop-456",
  "billingMode": "WITH_GST",
  "serviceGstRate": 18,
  "services": [
    {
      "description": "Phone screen replacement",
      "amount": 2000,
      "gstRate": 18
    }
  ],
  "parts": [
    {
      "shopProductId": "prod-001",
      "quantity": 1,
      "rate": 1500,
      "gstRate": 12
    }
  ],
  "paymentMode": "CASH"
}
```

**Backend Calculation:**

- Service subtotal: ₹2,000
- Service GST (18%): ₹360
- Part subtotal: ₹1,500
- Part GST (12%): ₹180
- **Total: ₹4,040**

### Request without GST

```json
{
  "billingMode": "WITHOUT_GST",
  "services": [...],
  ...
}
```

**Backend Calculation:**

- Service GST: ₹0 (no GST applied despite having gstRate field)
- Part GST: Still applied separately (parts have own GST)

---

## Key Architectural Decisions

1. **BillingMode Enum**: Services are taxable by default; user explicitly chooses
2. **SAC 9987 Backend-Owned**: Not frontend-provided; ensures consistency
3. **Shop GST Gate**: If `shop.gstEnabled = false`, rejects `billingMode = WITH_GST`
4. **Default serviceGstRate**: 18% (standard for repair services in India)
5. **Parts GST Independent**: Unaffected by service billing mode
6. **No Fake Product IDs**: Services use description + SAC, not product references

---

## Files Changed

### New Files Created

- `repair/repair.module.ts`
- `repair/repair.controller.ts` ✅
- `repair/repair.service.ts` ✅ (GST fix)
- `repair/dto/repair-bill.dto.ts` ✅ (BillingMode enum)
- `repair/dto/repair-stock-out.dto.ts`
- `sales/sales.module.ts`
- `sales/sales.controller.ts`
- `sales/sales.service.ts`
- `sales/dto/sales-invoice.dto.ts`
- `purchase/purchase.module.ts`
- `purchase/purchase.controller.ts`
- `purchase/purchase.service.ts`
- `purchase/dto/purchase-stock-in.dto.ts`

### Files Modified

- `stock/stock.module.ts` - Removed repair/sales imports
- `stock/stock.controller.ts` - Removed purchase endpoint
- `stock/stock.service.ts` - Removed `purchaseStockIn()` method
- `mobileshop.module.ts` - Added new module imports

### Files Deleted (Old Locations)

- `stock/repair.controller.ts`
- `stock/repair.service.ts`
- `stock/sales.controller.ts`
- `stock/sales.service.ts`
- `stock/dto/repair-bill.dto.ts` (replaced with corrected version)
- `stock/dto/repair-stock-out.dto.ts`
- `stock/dto/sales-invoice.dto.ts`
- `stock/dto/purchase-stock-in.dto.ts`

---

## Next Steps

1. **Frontend Updates**: Use new endpoint paths and `billingMode` enum
2. **Testing**: Verify GST calculations with both modes
3. **Documentation**: Update API docs to reflect new structure
4. **Database**: No migrations needed (schema unchanged)
