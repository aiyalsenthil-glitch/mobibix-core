# Invoice Numbering Uniqueness Fix

## Issue

Invoice numbers were not guaranteed to be unique across a tenant:

- **Sales Invoice** - No unique constraint (duplicate numbers possible)
- **Purchase Invoice** - `@@unique([shopId, invoiceNumber])` (unique per shop, not tenant)

## Solution

Added tenant-wide uniqueness constraints:

```prisma
// Invoice (Sales)
@@unique([tenantId, invoiceNumber])

// Purchase
@@unique([tenantId, invoiceNumber])  // Changed from [shopId, invoiceNumber]
```

## Migration Strategy

### Pre-Migration Checks

Before applying migration, verify no duplicate invoice numbers exist:

```sql
-- Check for duplicate sales invoice numbers within a tenant
SELECT
  "tenantId",
  "invoiceNumber",
  COUNT(*) as count
FROM "Invoice"
GROUP BY "tenantId", "invoiceNumber"
HAVING COUNT(*) > 1;

-- Check for duplicate purchase invoice numbers across shops within same tenant
SELECT
  "tenantId",
  "invoiceNumber",
  COUNT(*) as count
FROM "Purchase"
GROUP BY "tenantId", "invoiceNumber"
HAVING COUNT(*) > 1;
```

### If Duplicates Found

If duplicates exist, they must be resolved before migration:

#### Option 1: Append Shop Suffix (Recommended for Purchase)

```sql
-- Add shop suffix to purchase invoice numbers where duplicates exist
UPDATE "Purchase" p1
SET "invoiceNumber" = "invoiceNumber" || '-S' || RIGHT(p1."shopId", 4)
WHERE EXISTS (
  SELECT 1 FROM "Purchase" p2
  WHERE p1."tenantId" = p2."tenantId"
    AND p1."invoiceNumber" = p2."invoiceNumber"
    AND p1."id" != p2."id"
);
```

#### Option 2: Re-sequence (Only if safe)

```sql
-- Re-sequence invoice numbers with padding (risky - changes invoice numbers!)
WITH numbered AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY "tenantId" ORDER BY "createdAt") as new_seq
  FROM "Invoice"
  WHERE "tenantId" = 'your-tenant-id'
)
UPDATE "Invoice" i
SET "invoiceNumber" = 'INV-' || LPAD(n.new_seq::text, 6, '0')
FROM numbered n
WHERE i.id = n.id;
```

### Migration Files

1. **Schema Change**: `prisma/schema.prisma`
   - Invoice: Added `@@unique([tenantId, invoiceNumber])`
   - Purchase: Changed `@@unique([shopId, invoiceNumber])` → `@@unique([tenantId, invoiceNumber])`

2. **Migration SQL**: Will be generated via `prisma migrate dev`
   ```bash
   npx prisma migrate dev --name invoice_numbering_tenant_unique
   ```

### Post-Migration Validation

```sql
-- Verify uniqueness is enforced
SELECT COUNT(*) as total_invoices,
       COUNT(DISTINCT ("tenantId", "invoiceNumber")) as unique_combos
FROM "Invoice";

SELECT COUNT(*) as total_purchases,
       COUNT(DISTINCT ("tenantId", "invoiceNumber")) as unique_combos
FROM "Purchase";
```

## Database Drift Warning

**Current Status**: Development database has drift. The following changes exist in production but not in migration history:

- RefreshToken table added
- Multiple index additions
- WhatsApp-related schema changes

**Recommended Action**:

1. Sync migration history with production using `prisma db pull` or resolve drift
2. Apply invoice uniqueness migration separately
3. Test in staging environment before production

## Impact Assessment

- **Breaking**: If duplicate invoice numbers already exist, migration will fail
- **Data Integrity**: Prevents future duplicate invoice numbers (accounting requirement)
- **Application Code**: No changes needed (existing code already generates unique numbers via DocumentNumberService)

## Testing Checklist

- [ ] Run duplicate detection queries on production
- [ ] Resolve any duplicates found
- [ ] Test migration in staging environment
- [ ] Verify invoice creation still works
- [ ] Verify no application errors after constraint addition

## Rollback Plan

If migration fails:

```bash
cd apps/backend
npx prisma migrate resolve --rolled-back invoice_numbering_tenant_unique
```

Then fix duplicate data and retry migration.
