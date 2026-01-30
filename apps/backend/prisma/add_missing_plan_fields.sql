-- Add missing fields to Plan table
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "code" TEXT;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'INR';
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "durationDays" INTEGER;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "maxMembers" INTEGER;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "features" JSONB;

-- Add unique constraint on code
CREATE UNIQUE INDEX IF NOT EXISTS "Plan_code_key" ON "Plan"("code");

-- Create PlanFeature table if it doesn't exist
CREATE TABLE IF NOT EXISTS "PlanFeature" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "planId" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "PlanFeature_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Add unique constraint and index for PlanFeature
CREATE UNIQUE INDEX IF NOT EXISTS "PlanFeature_planId_feature_key" ON "PlanFeature"("planId", "feature");
CREATE INDEX IF NOT EXISTS "PlanFeature_planId_idx" ON "PlanFeature"("planId");
