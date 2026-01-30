-- Add missing code column to Plan table
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "code" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Plan_code_key" ON "Plan"("code");
