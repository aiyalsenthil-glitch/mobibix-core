-- Manual migration to handle InvoiceStatus enum change
-- Step 1: Add VOIDED to existing enum (before removing CANCELLED)

ALTER TYPE "InvoiceStatus" ADD VALUE IF NOT EXISTS 'VOIDED';
ALTER TYPE "InvoiceStatus" ADD VALUE IF NOT EXISTS 'DRAFT';
ALTER TYPE "InvoiceStatus" ADD VALUE IF NOT EXISTS 'FINAL';

-- Step 2: Migrate existing data
UPDATE "Invoice" 
SET status = 'VOIDED'
WHERE status = 'CANCELLED';

-- Step 3: Verify - all CANCELLED should be VOIDED now
SELECT status, COUNT(*) as count 
FROM "Invoice" 
GROUP BY status;
