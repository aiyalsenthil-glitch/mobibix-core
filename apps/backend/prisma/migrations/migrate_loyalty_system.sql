-- Migration: Loyalty System Restructure
-- Phase 1: Add new tables and columns
-- Phase 2: Migrate existing data
-- Phase 3: Remove old loyaltyPoints column

-- =====================================================
-- PHASE 1: CREATE NEW STRUCTURE
-- =====================================================

-- 1. Create LoyaltyConfig table
CREATE TABLE "LoyaltyConfig" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    
    -- Feature Toggle
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    
    -- Earning Rules (all amounts in paise)
    "earnAmountPerPoint" INTEGER NOT NULL DEFAULT 10000,  -- ₹100 = 1 point
    "pointsPerEarnUnit" INTEGER NOT NULL DEFAULT 1,
    
    -- Redemption Rules
    "pointValueInRupees" DOUBLE PRECISION NOT NULL DEFAULT 1.0,  -- 1 point = ₹1
    "maxRedeemPercent" INTEGER NOT NULL DEFAULT 50,              -- Max 50% of invoice
    
    -- Category Restrictions
    "allowOnRepairs" BOOLEAN NOT NULL DEFAULT true,
    "allowOnAccessories" BOOLEAN NOT NULL DEFAULT true,
    "allowOnServices" BOOLEAN NOT NULL DEFAULT false,
    
    -- Expiry
    "expiryDays" INTEGER,  -- null = never expires
    
    -- Admin Controls
    "allowManualAdjustment" BOOLEAN NOT NULL DEFAULT false,
    "minInvoiceForEarn" INTEGER,  -- Minimum invoice amount in paise
    
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoyaltyConfig_pkey" PRIMARY KEY ("id")
);

-- 2. Add new LoyaltyTransactionType enum
CREATE TYPE "LoyaltyTransactionType" AS ENUM ('EARN', 'REDEEM', 'EXPIRE', 'MANUAL', 'REVERSAL');

-- 3. Add columns to LoyaltyTransaction
ALTER TABLE "LoyaltyTransaction" 
ADD COLUMN "type" "LoyaltyTransactionType",
ADD COLUMN "invoiceId" TEXT,
ADD COLUMN "reversalOf" TEXT,
ADD COLUMN "createdBy" TEXT;

-- 4. Create indexes
CREATE UNIQUE INDEX "LoyaltyConfig_tenantId_key" ON "LoyaltyConfig"("tenantId");
CREATE INDEX "LoyaltyConfig_tenantId_idx" ON "LoyaltyConfig"("tenantId");
CREATE INDEX "LoyaltyTransaction_invoiceId_idx" ON "LoyaltyTransaction"("invoiceId");
CREATE INDEX "LoyaltyTransaction_reversalOf_idx" ON "LoyaltyTransaction"("reversalOf");

-- 5. Add foreign keys
ALTER TABLE "LoyaltyConfig" ADD CONSTRAINT "LoyaltyConfig_tenantId_fkey" 
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- =====================================================
-- PHASE 2: MIGRATE EXISTING DATA
-- =====================================================

-- 6. Create default LoyaltyConfig for all existing tenants
INSERT INTO "LoyaltyConfig" ("id", "tenantId", "isEnabled", "earnAmountPerPoint", "pointsPerEarnUnit", "pointValueInRupees", "maxRedeemPercent", "updatedAt")
SELECT 
    gen_random_uuid()::text,  -- Generate CUID-like ID
    "id" as "tenantId",
    false as "isEnabled",  -- Disabled by default (manual opt-in required)
    10000 as "earnAmountPerPoint",  -- ₹100 = 1 point
    1 as "pointsPerEarnUnit",
    1.0 as "pointValueInRupees",
    50 as "maxRedeemPercent",
    CURRENT_TIMESTAMP as "updatedAt"
FROM "Tenant"
WHERE NOT EXISTS (
    SELECT 1 FROM "LoyaltyConfig" WHERE "LoyaltyConfig"."tenantId" = "Tenant"."id"
);

-- 7. Update existing LoyaltyTransaction records with default type
-- Map existing 'source' to new 'type' field
UPDATE "LoyaltyTransaction"
SET "type" = CASE
    WHEN "source" = 'INVOICE' THEN 'EARN'::text::"LoyaltyTransactionType"
    WHEN "source" = 'REDEMPTION' THEN 'REDEEM'::text::"LoyaltyTransactionType"
    WHEN "source" = 'MANUAL' THEN 'MANUAL'::text::"LoyaltyTransactionType"
    WHEN "source" = 'PROMOTION' THEN 'EARN'::text::"LoyaltyTransactionType"
    WHEN "source" = 'REFERRAL' THEN 'EARN'::text::"LoyaltyTransactionType"
    ELSE 'MANUAL'::text::"LoyaltyTransactionType"
END
WHERE "type" IS NULL;

-- 8. Make 'type' column NOT NULL after migration
ALTER TABLE "LoyaltyTransaction" ALTER COLUMN "type" SET NOT NULL;

-- 9. Reconcile Party.loyaltyPoints with LoyaltyTransaction ledger
-- Create MANUAL adjustments for any discrepancies

-- Create temp table to store discrepancies
CREATE TEMP TABLE loyalty_discrepancies AS
SELECT 
    p."id" as "customerId",
    p."tenantId",
    p."loyaltyPoints" as "directBalance",
    COALESCE(SUM(lt."points"), 0) as "ledgerBalance",
    (p."loyaltyPoints" - COALESCE(SUM(lt."points"), 0)) as "difference"
FROM "Party" p
LEFT JOIN "LoyaltyTransaction" lt ON lt."customerId" = p."id"
GROUP BY p."id", p."tenantId", p."loyaltyPoints"
HAVING p."loyaltyPoints" != COALESCE(SUM(lt."points"), 0);

-- Create MANUAL adjustment transactions for discrepancies
INSERT INTO "LoyaltyTransaction" ("id", "tenantId", "customerId", "points", "type", "source", "note", "createdAt")
SELECT 
    gen_random_uuid()::text,
    "tenantId",
    "customerId",
    "difference",
    'MANUAL'::text::"LoyaltyTransactionType",
    'MANUAL'::"LoyaltySource",
    'Migration adjustment: Reconciling direct balance with ledger',
    CURRENT_TIMESTAMP
FROM loyalty_discrepancies
WHERE "difference" != 0;

-- Drop temp table
DROP TABLE loyalty_discrepancies;

-- =====================================================
-- PHASE 3: CLEANUP (RUN AFTER VERIFICATION)
-- =====================================================

-- 10. Remove Party.loyaltyPoints column
-- IMPORTANT: Only run this after verifying the migration!
-- COMMENT OUT until ready:

-- ALTER TABLE "Party" DROP COLUMN "loyaltyPoints";

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Count of tenants with loyalty config
-- SELECT COUNT(*) FROM "LoyaltyConfig";

-- Count of transactions with new type field
-- SELECT "type", COUNT(*) FROM "LoyaltyTransaction" GROUP BY "type";

-- Check for balance mismatches (should be 0 after migration)
-- SELECT 
--     p."id",
--     p."name",
--     p."loyaltyPoints" as "direct",
--     COALESCE(SUM(lt."points"), 0) as "ledger",
--     (p."loyaltyPoints" - COALESCE(SUM(lt."points"), 0)) as "diff"
-- FROM "Party" p
-- LEFT JOIN "LoyaltyTransaction" lt ON lt."customerId" = p."id"
-- GROUP BY p."id", p."name", p."loyaltyPoints"
-- HAVING p."loyaltyPoints" != COALESCE(SUM(lt."points"), 0);
