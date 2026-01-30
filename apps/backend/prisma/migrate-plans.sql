-- Migrate existing Plan records to add code field
-- Run this BEFORE applying the Prisma migration

UPDATE "Plan" 
SET code = UPPER(name) 
WHERE code IS NULL OR code = '';

-- Verify
SELECT id, name, code, "maxMembers", "memberLimit" FROM "Plan";
