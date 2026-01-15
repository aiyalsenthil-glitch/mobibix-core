-- 1. Add column as NULLABLE (safe for existing rows)
ALTER TABLE "TenantSubscription"
ADD COLUMN "updatedAt" TIMESTAMP;

-- 2. Backfill existing rows
UPDATE "TenantSubscription"
SET "updatedAt" = "createdAt"
WHERE "updatedAt" IS NULL;

-- 3. Enforce NOT NULL going forward
ALTER TABLE "TenantSubscription"
ALTER COLUMN "updatedAt" SET NOT NULL;
