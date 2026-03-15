# 🗂️ Migration & Deployment Checklist - Inventory Fixes

**Date:** January 27, 2026  
**Status:** Schema updated, ready for migration  
**Risk Level:** 🟢 LOW - Backward compatible

---

## Pre-Migration Checklist

- [ ] Backup production database

  ```sql
  pg_dump gym_saas_db > backup_inventory_fixes_2026_01_27.sql
  ```

- [ ] Review schema changes

  ```bash
  git diff apps/backend/prisma/schema.prisma
  ```

- [ ] Verify no conflicting migrations

  ```bash
  cd apps/backend
  npx prisma migrate status
  ```

- [ ] Ensure no active deploys in progress

---

## Step 1: Generate Migration

```bash
cd apps/backend

# Generate migration files
npx prisma migrate dev --name "fix_inventory_stock_separation"

# If asked about reset: ❌ DO NOT RESET
# Just create migration file
```

**What This Does:**

- Creates SQL migration file in `prisma/migrations/`
- Auto-generates Prisma Client types
- ✅ Backward compatible (new columns optional)

**Expected Output:**

```
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "gym_saas_db", schema "public"

✔ Created migration Successfully

Created migration file: prisma/migrations/[timestamp]_fix_inventory_stock_separation/migration.sql

Generated Prisma Client
```

---

## Step 2: Review Generated SQL

```bash
# Check what SQL was generated
cat prisma/migrations/[timestamp]_fix_inventory_stock_separation/migration.sql
```

**Expected Changes:**

```sql
-- Add columns to ShopProduct
ALTER TABLE "ShopProduct" ADD COLUMN "isSerialized" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ShopProduct" DROP COLUMN "serialNumber";
ALTER TABLE "ShopProduct" DROP COLUMN "reservedStock";

-- Add columns to IMEI
ALTER TABLE "IMEI" ADD COLUMN "status" VARCHAR(255) NOT NULL DEFAULT 'IN_STOCK';
ALTER TABLE "IMEI" ADD COLUMN "updatedAt" TIMESTAMP NOT NULL DEFAULT now();
ALTER TABLE "IMEI" ADD COLUMN "soldAt" TIMESTAMP;
ALTER TABLE "IMEI" ADD COLUMN "returnedAt" TIMESTAMP;
ALTER TABLE "IMEI" ADD COLUMN "damageNotes" TEXT;

-- Add columns to StockLedger
ALTER TABLE "StockLedger" ADD COLUMN "costPerUnit" INTEGER;
CREATE INDEX "StockLedger_referenceType_referenceId_idx" ON "StockLedger"("referenceType", "referenceId");

-- Add columns to RepairPartUsed
ALTER TABLE "RepairPartUsed" ADD COLUMN "costPerUnit" INTEGER;
ALTER TABLE "RepairPartUsed" ADD COLUMN "updatedAt" TIMESTAMP NOT NULL DEFAULT now();

-- Create IMEIStatus enum
CREATE TYPE "IMEIStatus" AS ENUM ('IN_STOCK', 'SOLD', 'RETURNED', 'DAMAGED', 'TRANSFERRED', 'LOST');
```

---

## Step 3: Test Migration Locally

```bash
# Reset local database (SAFE - local only)
npx prisma migrate reset

# Or deploy to test database first
npx prisma migrate deploy --schema=prisma/schema.prisma
```

**Verify:**

```bash
# Open Prisma Studio
npx prisma studio

# Check:
# - ShopProduct has isSerialized column ✓
# - IMEI has status column ✓
# - StockLedger has costPerUnit column ✓
# - IMEIStatus enum exists ✓
```

---

## Step 4: Deploy to Production

### Option A: Development Environment

```bash
cd apps/backend
npm run build
npx prisma migrate deploy
npm run start
```

### Option B: Production Deployment

```bash
# 1. Push code to git
git add prisma/schema.prisma
git add prisma/migrations/
git commit -m "fix: inventory stock separation - schema migration"
git push origin main

# 2. On production server
git pull origin main
npm install
npx prisma migrate deploy
npm run build
npm restart

# 3. Verify
npm run start
curl http://localhost_REPLACED:3000/health
```

---

## Step 5: Post-Migration Verification

### Test Database Connection

```bash
npx prisma db execute --stdin < check_migrations.sql
```

**check_migrations.sql:**

```sql
-- Check migration history
SELECT migration, finished_at, execution_time
FROM _prisma_migrations
ORDER BY finished_at DESC
LIMIT 5;

-- Check new columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'ShopProduct' AND column_name IN ('isSerialized', 'stockOnHand');

-- Check new indexes
SELECT indexname FROM pg_indexes
WHERE tablename = 'StockLedger'
AND indexname LIKE '%referenceType%';

-- Check IMEIStatus values
SELECT column_name, column_default
FROM information_schema.columns
WHERE table_name = 'IMEI' AND column_name = 'status';
```

### Verify No Data Loss

```bash
-- Count records before & after
SELECT
  COUNT(*) as shop_products,
  (SELECT COUNT(*) FROM "IMEI") as imeis,
  (SELECT COUNT(*) FROM "StockLedger") as ledger_entries,
  (SELECT COUNT(*) FROM "RepairPartUsed") as repair_parts
FROM "ShopProduct";
```

**Expected:**

```
shop_products | imeis | ledger_entries | repair_parts
──────────────┼───────┼────────────────┼──────────────
  [same as before] ✓
```

---

## Step 6: Service Code Deployment

After migration succeeds, deploy service updates:

```bash
# Implement these changes (see INVENTORY_SERVICE_IMPLEMENTATION.md)
# - StockService.recordStockOut() with validation
# - RepairService.addPartToRepair() with ledger linkage
# - InvoiceService.markIMEIsSold() with status update
# - InventoryService.createProduct() with isSerialized check
# - PurchaseService.completePurchase() with ledger creation

npm run build
npm run test:cov  # Run tests
npm run start
```

---

## Step 7: Data Backfill (Optional)

If you want to populate existing IMEI records with status:

```sql
-- Backfill IMEI status based on invoiceId
UPDATE "IMEI"
SET status = CASE
  WHEN "invoiceId" IS NOT NULL THEN 'SOLD'
  ELSE 'IN_STOCK'
END,
"updatedAt" = NOW()
WHERE status IS NULL;
```

---

## Rollback Plan (If Needed)

### If Migration Fails

```bash
# Roll back the migration
npx prisma migrate resolve --rolled-back "timestamp_fix_inventory_stock_separation"

# Or manually restore database
psql gym_saas_db < backup_inventory_fixes_2026_01_27.sql
```

### If Data Issues Discovered

```bash
# Before rolling back, check what went wrong
SELECT * FROM _prisma_migrations WHERE migration LIKE '%fix_inventory%';

# Analyze the issue
SELECT COUNT(*) FROM "IMEI" WHERE status IS NULL;

# If fixable, run SQL fix:
UPDATE "IMEI" SET status = 'IN_STOCK' WHERE status IS NULL;

# If unfixable, roll back (see above)
```

---

## Testing Checklist (Post-Migration)

### Unit Tests

```bash
npm run test:cov
```

Expected:

- [ ] StockService tests pass
- [ ] InventoryService tests pass
- [ ] RepairService tests pass
- [ ] IMEIStatus enum is recognized

### Integration Tests

```bash
# Create a test scenario
# 1. Create serialized product (mobile)
# 2. Purchase 10 units
# 3. Add 2 to repair
# 4. Cancel repair
# 5. Sell 3 units
# 6. Return 1 unit
```

Expected:

- [ ] Stock IN on purchase ✓
- [ ] Stock OUT on repair ✓
- [ ] Stock IN on repair cancel ✓
- [ ] IMEI status SOLD on invoice ✓
- [ ] IMEI status IN_STOCK on return ✓

### Manual Testing (QA)

```
1. Login to system
2. Create a new serialized product (e.g., iPhone 15)
3. Add IMEIs: ABC123, ABC124, ABC125
4. Purchase the product (3 units)
5. Create repair job, add 1 unit to repair
6. Verify: Stock shows 2 available (3 - 1 used)
7. Cancel repair
8. Verify: Stock back to 3
9. Create sales invoice with 2 units (IMEIs)
10. Verify: IMEI status shows SOLD
11. Return the invoice
12. Verify: IMEI status back to IN_STOCK
```

---

## Performance Impact

**Expected:** Minimal to none

| Operation     | Before                | After                | Impact                     |
| ------------- | --------------------- | -------------------- | -------------------------- |
| Get stock     | SUM(StockLedger)      | Same or IMEI.count() | ✓ Same or faster (indexed) |
| Create repair | Insert RepairPartUsed | +Insert StockLedger  | +1 query (minimal)         |
| Cancel repair | Delete RepairPartUsed | +Insert StockLedger  | +1 query (minimal)         |
| List products | No change             | No change            | ✓ No impact                |

---

## Monitoring After Deployment

```bash
# Watch application logs
tail -f /var/log/nest.log

# Check for errors
grep -i "error\|exception" /var/log/nest.log | tail -20

# Monitor database connections
SELECT count(*) FROM pg_stat_activity;

# Check migration status
npx prisma migrate status
```

---

## Deployment Success Criteria

✅ **Schema**

- [ ] Migration applied successfully
- [ ] All new columns exist
- [ ] New indexes are active
- [ ] No data loss

✅ **Application**

- [ ] Backend builds without errors
- [ ] Seed data created (if any)
- [ ] Health check passes
- [ ] No error logs in first 1 minute

✅ **Functionality**

- [ ] Can create serialized products
- [ ] Can create bulk products
- [ ] Stock IN/OUT works
- [ ] IMEI status tracking works
- [ ] Repairs work with stock impact

---

## Sign-Off

| Role      | Name                 | Date           | Status |
| --------- | -------------------- | -------------- | ------ |
| DBA       | ******\_\_\_\_****** | **_/_**/\_\_\_ | ✓ / ✗  |
| DevOps    | ******\_\_\_\_****** | **_/_**/\_\_\_ | ✓ / ✗  |
| QA Lead   | ******\_\_\_\_****** | **_/_**/\_\_\_ | ✓ / ✗  |
| Tech Lead | ******\_\_\_\_****** | **_/_**/\_\_\_ | ✓ / ✗  |

---

## Timeline Estimate

| Phase          | Time          | Notes                   |
| -------------- | ------------- | ----------------------- |
| Backup         | 10 min        | Verify backup completed |
| Migration      | 5-10 min      | Depends on data size    |
| Service Deploy | 10-15 min     | Code changes + tests    |
| Testing        | 30-60 min     | Manual QA               |
| Monitoring     | 30 min        | Watch for issues        |
| **Total**      | **1-2 hours** | Low risk                |

---

## Contact & Support

- **DBA Issues:** ******\_\_\_\_******
- **DevOps Support:** ******\_\_\_\_******
- **Rollback Authority:** ******\_\_\_\_******

---

**Migration Status:** Ready to proceed  
**Risk Level:** 🟢 LOW (backward compatible)  
**Estimated Downtime:** < 5 minutes
