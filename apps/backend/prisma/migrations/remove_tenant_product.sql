-- Migration: Remove TenantProduct and simplify to GlobalProduct + ShopProduct
-- Date: 2026-01-28
-- Purpose: Eliminate tenant-level product duplication and align architecture with Supplier model

-- ============================================================================
-- STEP 1: DATA MIGRATION - Convert TenantProduct links to custom ShopProducts
-- ============================================================================
-- This preserves all data by converting TenantProduct-linked ShopProducts
-- into standalone custom products (globalProductId = null)

-- Update all ShopProducts that reference TenantProduct:
-- Set globalProductId = null (marks them as custom products)
-- Keep all other fields intact (name, pricing, tax, inventory)
UPDATE "ShopProduct"
SET "globalProductId" = NULL
WHERE "tenantProductId" IS NOT NULL;

-- ============================================================================
-- STEP 2: SCHEMA CHANGES - Drop TenantProduct and related constraints
-- ============================================================================

-- Drop foreign key constraint from ShopProduct to TenantProduct
ALTER TABLE "ShopProduct" DROP CONSTRAINT IF EXISTS "ShopProduct_tenantProductId_fkey";

-- Drop index on tenantProductId
DROP INDEX IF EXISTS "ShopProduct_tenantProductId_idx";

-- Drop the tenantProductId column from ShopProduct
ALTER TABLE "ShopProduct" DROP COLUMN IF EXISTS "tenantProductId";

-- Drop foreign key constraints from TenantProduct
ALTER TABLE "TenantProduct" DROP CONSTRAINT IF EXISTS "TenantProduct_tenantId_fkey";
ALTER TABLE "TenantProduct" DROP CONSTRAINT IF EXISTS "TenantProduct_categoryId_fkey";
ALTER TABLE "TenantProduct" DROP CONSTRAINT IF EXISTS "TenantProduct_hsnId_fkey";

-- Drop indexes on TenantProduct
DROP INDEX IF EXISTS "TenantProduct_tenantId_idx";
DROP INDEX IF EXISTS "TenantProduct_categoryId_idx";
DROP INDEX IF EXISTS "TenantProduct_hsnId_idx";
DROP INDEX IF EXISTS "TenantProduct_tenantId_name_categoryId_key";

-- Drop the TenantProduct table
DROP TABLE IF EXISTS "TenantProduct";

-- ============================================================================
-- STEP 3: UPDATE INDEX ON SHOPPRODUCT
-- ============================================================================

-- Create new index for globalProductId (replaces tenantProductId index)
CREATE INDEX IF NOT EXISTS "ShopProduct_globalProductId_idx" ON "ShopProduct"("globalProductId");

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check: No orphaned references should exist
-- SELECT COUNT(*) FROM "ShopProduct" WHERE "tenantProductId" IS NOT NULL;
-- Expected: Error (column doesn't exist) or 0

-- Check: Products are properly categorized
-- SELECT 
--   COUNT(*) as total_products,
--   COUNT(CASE WHEN "globalProductId" IS NOT NULL THEN 1 END) as from_global,
--   COUNT(CASE WHEN "globalProductId" IS NULL THEN 1 END) as custom
-- FROM "ShopProduct";

-- Check: All critical relations intact
-- SELECT sp.id, sp.name, sp."globalProductId", sp."shopId", s."tenantId"
-- FROM "ShopProduct" sp
-- JOIN "Shop" s ON sp."shopId" = s.id
-- LIMIT 10;

-- ============================================================================
-- ROLLBACK PLAN (IF NEEDED)
-- ============================================================================
-- WARNING: This assumes you have a backup of TenantProduct data
-- 
-- 1. Restore TenantProduct table from backup
-- 2. Add tenantProductId column back to ShopProduct
-- 3. Restore foreign key constraints
-- 4. Update ShopProducts to re-link to TenantProducts
--
-- DO NOT RUN THIS UNLESS YOU HAVE VERIFIED BACKUPS!
