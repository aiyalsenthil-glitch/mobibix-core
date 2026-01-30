# Stock Correction & Negative Stock Reporting API

## Overview

Backend API endpoints for manual stock adjustments and negative stock reporting, with full audit trail and validation.

## Endpoints

### POST `/mobileshop/stock/correct`

Manual stock correction for bulk (non-serialized) products.

**Authentication**: Required (JWT)

**Request Body**:

```typescript
{
  shopId: string;           // Required
  shopProductId: string;    // Required
  quantity: number;         // Required, cannot be 0
  reason: string;           // Required
  note?: string;           // Optional
}
```

**Validations**:

- Product must exist and be active
- Product cannot be `SERVICE` type
- Product cannot be serialized (use IMEI-based flow instead)
- Quantity cannot be 0 (use `@NotEquals(0)` decorator)

**Response**:

```typescript
{
  id: string; // StockCorrection record ID
  success: boolean; // Always true on success
}
```

**Error Responses**:

- `400` - Product not found
- `400` - SERVICE products cannot be corrected
- `400` - Use IMEI-based stock correction (for serialized products)
- `400` - Validation errors (quantity = 0, etc.)

**Behavior**:

1. Creates audit record in `StockCorrection` table
2. Calls `StockService.recordStockIn()` for positive quantities
3. Calls `StockService.recordStockOut()` for negative quantities
4. Uses `referenceType: 'ADJUSTMENT'` with `correctionId` as reference
5. Rolls back `StockCorrection` record if stock operation fails

---

### GET `/reports/negative-stock`

Get list of products with negative stock levels.

**Authentication**: Required (JWT)

**Query Parameters**:

```typescript
shopId?: string;          // Optional - filter by specific shop
```

**Response**:

```typescript
{
  items: [
    {
      shopProductId: string;
      shopId: string;
      shopName: string;
      productName: string;
      currentStock: number;        // Negative value
      firstNegativeDate: string;   // ISO datetime when stock first went negative
    }
  ]
}
```

**Behavior**:

1. Iterates through `StockLedger` entries chronologically per product
2. Computes cumulative stock (SUM of quantity with +/- based on type)
3. Captures `firstNegativeDate` when balance transitions below zero
4. Filters out:
   - Serialized products (tracked via IMEI, not stock level)
   - SERVICE products (no physical stock)

---

## Database Schema

### StockCorrection Model

```prisma
model StockCorrection {
  id              String       @id @default(cuid())
  tenantId        String
  shopId          String
  shopProductId   String
  quantity        Int          // Positive = add, Negative = subtract
  reason          String       // Required explanation
  note            String?      // Optional details
  createdBy       String?      // User ID who created correction
  createdAt       DateTime     @default(now())

  // Relations
  tenant          Tenant       @relation(fields: [tenantId], references: [id])
  shop            Shop         @relation(fields: [shopId], references: [id])
  product         ShopProduct  @relation(fields: [shopProductId], references: [id])
}
```

**Indexes**: None yet (consider adding on `[tenantId, createdAt]` for audit queries)

---

## Implementation Files

- **DTOs**:
  - `src/core/stock/dto/stock-correction.dto.ts` - Request validation
  - `src/core/stock/dto/negative-stock-report.dto.ts` - Response structure

- **Services**:
  - `src/core/stock/stock-correction.service.ts` - Correction business logic
  - `src/core/stock/stock-report.service.ts` - Negative stock calculation

- **Controllers**:
  - `src/core/stock/stock-correction.controller.ts` - POST endpoint
  - `src/core/stock/stock-report.controller.ts` - GET endpoint

- **Module**: `src/core/stock/stock.module.ts` (all services/controllers registered)

---

## Configuration

**Environment Variables**: None required (uses existing `DATABASE_URL`, `JWT_SECRET`)

**Feature Flags**: None (always enabled)

---

## Testing

### Manual Test - Stock Correction

```bash
curl -X POST http://localhost_REPLACED:3000/mobileshop/stock/correct \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "shopId": "shop123",
    "shopProductId": "prod456",
    "quantity": -5,
    "reason": "Damaged inventory write-off",
    "note": "Water damage from roof leak"
  }'
```

### Manual Test - Negative Stock Report

```bash
curl -X GET "http://localhost_REPLACED:3000/reports/negative-stock?shopId=shop123" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Known Issues

- **TypeScript Warnings**: `stock-correction.service.ts` shows `no-unsafe-*` errors due to Prisma schema update timing (false positives, suppressed via eslint-disable)
- **Performance**: Negative stock report iterates all `StockLedger` entries per product (consider materialized view for large datasets)

---

## Related Features

- **IMEI Tracking**: For serialized products (separate flow, not covered here)
- **Stock In/Out**: `StockService.recordStockIn()` / `recordStockOut()` (called by correction API)
- **Sales Invoice**: Frontend uses stock balances to show warnings (yellow banners for negative stock)

---

## Migration

**Applied**: `20260128061653_add_stock_correction`

```sql
-- Creates StockCorrection table with FK constraints to Tenant, Shop, ShopProduct
-- Adds backref relations to existing models
```

**Rollback**: Not recommended after production use (would lose audit trail)
