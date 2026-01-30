-- ================================================
-- MIGRATE WhatsAppAutomation to new safe structure
-- ================================================

-- Step 1: Add ModuleType enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE "ModuleType" AS ENUM ('GYM', 'MOBILE_SHOP');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 2: Add new columns to WhatsAppAutomation
ALTER TABLE "WhatsAppAutomation" 
  ADD COLUMN IF NOT EXISTS "eventType" TEXT,
  ADD COLUMN IF NOT EXISTS "conditions" JSONB,
  ADD COLUMN IF NOT EXISTS "description" TEXT,
  ADD COLUMN IF NOT EXISTS "requiresOptIn" BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS "createdBy" TEXT;

-- Step 3: Migrate data: copy triggerType to eventType
UPDATE "WhatsAppAutomation" 
SET "eventType" = "triggerType"::TEXT 
WHERE "eventType" IS NULL;

-- Step 4: Make eventType NOT NULL after migration
ALTER TABLE "WhatsAppAutomation" 
  ALTER COLUMN "eventType" SET NOT NULL;

-- Step 5: Change moduleType from TEXT to ModuleType enum
-- First, update existing data to match enum values
UPDATE "WhatsAppAutomation" 
SET "moduleType" = 'MOBILE_SHOP' 
WHERE "moduleType" = 'MOBILESHOP';

-- Then alter the column type
ALTER TABLE "WhatsAppAutomation" 
  ALTER COLUMN "moduleType" TYPE "ModuleType" USING "moduleType"::"ModuleType";

-- Step 6: Add hasCoaching field to Member
ALTER TABLE "Member" 
  ADD COLUMN IF NOT EXISTS "hasCoaching" BOOLEAN DEFAULT false;

-- Step 7: Update indexes
DROP INDEX IF EXISTS "WhatsAppAutomation_moduleType_triggerType_idx";
CREATE INDEX IF NOT EXISTS "WhatsAppAutomation_moduleType_eventType_idx" 
  ON "WhatsAppAutomation"("moduleType", "eventType");
