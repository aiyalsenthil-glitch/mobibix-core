-- Drop unique constraint to allow multiple automations per trigger type
ALTER TABLE "WhatsAppAutomation" DROP CONSTRAINT IF EXISTS "WhatsAppAutomation_moduleType_triggerType_key";

-- Add index for query performance
CREATE INDEX IF NOT EXISTS "WhatsAppAutomation_moduleType_triggerType_idx" ON "WhatsAppAutomation"("moduleType", "triggerType");
