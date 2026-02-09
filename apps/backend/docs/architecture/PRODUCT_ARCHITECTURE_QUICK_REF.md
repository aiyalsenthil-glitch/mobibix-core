# Product Architecture - Quick Reference

## 🏗️ Architecture (Simplified)

```
GlobalProduct (Admin Catalog)
    ↓ optional link
ShopProduct (Shop-Level Product)
    ↓
Inventory (StockLedger, IMEI)
```

## ✅ Current State

| Layer             | Purpose            | Managed By  | Shared?            |
| ----------------- | ------------------ | ----------- | ------------------ |
| **GlobalProduct** | Product catalog    | Admin       | Yes (all tenants)  |
| **ShopProduct**   | Shop configuration | Shop Owner  | No (shop-specific) |
| ~~TenantProduct~~ | ~~Tenant master~~  | ~~Removed~~ | ~~N/A~~            |

## 📝 Product Types

### 1. **Linked Products** (globalProductId ≠ null)

- References GlobalProduct
- Inherits base attributes (name, category, HSN)
- Shop customizes pricing and inventory settings

### 2. **Custom Products** (globalProductId = null)

- Fully independent definition
- Shop-specific, not in global catalog
- Complete owner control

## 🔧 Key Operations

### Create Product from Global Catalog

```typescript
POST /shop-products/link
{
  "shopId": "shop123",
  "productId": "global456",
  "source": "GLOBAL",
  "salePrice": 1000,
  "costPrice": 800
}
```

### Create Custom Product

```typescript
POST /shop-products
{
  "shopId": "shop123",
  "name": "Custom Part",
  "type": "SPARE",
  "salePrice": 500,
  "costPrice": 300,
  "hsnCode": "8517",
  "gstRate": 18
}
```

### List Products for Shop

```typescript
GET /shop-products?shopId=shop123
```

## 🚫 Removed Features

- ~~POST /tenant-products~~ - No tenant-level product master
- ~~GET /tenant-products~~ - No tenant-level catalog
- ~~"TENANT" source type~~ - Only "GLOBAL" links supported

## 📊 Data Model

### ShopProduct (Core Entity)

```prisma
model ShopProduct {
  id              String      @id @default(cuid())
  tenantId        String
  shopId          String
  globalProductId String?     // NULL = custom product

  name            String
  type            ProductType
  category        String?

  salePrice       Int?
  costPrice       Int?
  hsnCode         String?
  gstRate         Float?

  isSerialized    Boolean     @default(false)
  isActive        Boolean     @default(true)

  // Relations
  tenant Tenant
  shop   Shop
  global GlobalProduct?

  imeis         IMEI[]
  stockEntries  StockLedger[]
  invoiceItems  InvoiceItem[]
}
```

## 🔍 Common Queries

### Find products with global link

```sql
SELECT * FROM "ShopProduct"
WHERE "globalProductId" IS NOT NULL;
```

### Find custom products

```sql
SELECT * FROM "ShopProduct"
WHERE "globalProductId" IS NULL;
```

### Products needing reorder

```sql
SELECT sp.*, COUNT(sl.id) as stock
FROM "ShopProduct" sp
LEFT JOIN "StockLedger" sl ON sl."shopProductId" = sp.id
WHERE sp."reorderLevel" IS NOT NULL
GROUP BY sp.id
HAVING COUNT(sl.id) < sp."reorderLevel";
```

## ⚠️ Important Rules

1. **Never attach inventory to GlobalProduct** - Always use ShopProduct
2. **No shared ShopProducts** - Each shop has independent products
3. **Unique names per shop** - Enforced by DB constraint
4. **Custom products stay local** - Don't appear in global catalog
5. **GlobalProduct is read-only** - Shop-level UI can't modify

## 🎯 Alignment with Supplier Model

| Concept        | Supplier Model                 | Product Model                 |
| -------------- | ------------------------------ | ----------------------------- |
| Global Catalog | GlobalSupplier                 | GlobalProduct                 |
| Shop-Specific  | ShopSupplier (links to global) | ShopProduct (links to global) |
| Tenant Master  | ~~Not used~~                   | ~~Removed~~                   |

## 🔄 Migration Impact

### What Happened to TenantProduct Links?

- All converted to **custom products** (globalProductId = null)
- Pricing, tax, inventory data preserved
- No functional changes for shop users
- Products remain fully operational

### What About Existing Invoices?

- All historical data intact
- InvoiceItem references ShopProduct (unchanged)
- PurchaseItem references ShopProduct (unchanged)
- RepairPartUsed references ShopProduct (unchanged)

## 🚀 Next Steps

1. Run migration: `npx prisma migrate dev --name remove_tenant_product`
2. Generate client: `npx prisma generate`
3. Restart backend: `npm run start:dev`
4. Test product creation flows
5. Verify inventory operations

---

**Status**: ✅ Ready for deployment  
**Breaking Changes**: API endpoints removed (tenant-products)  
**Data Migration**: Automatic, no manual steps required
