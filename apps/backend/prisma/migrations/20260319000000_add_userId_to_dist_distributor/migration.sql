-- AlterTable: add userId column to dist_distributors for direct user linkage
-- This allows pure distributors (no ERP tenant) to be linked by Firebase user ID.
ALTER TABLE "dist_distributors" ADD COLUMN IF NOT EXISTS "userId" TEXT;

-- CreateIndex: unique constraint on userId
CREATE UNIQUE INDEX IF NOT EXISTS "dist_distributors_userId_key" ON "dist_distributors"("userId");

-- Ensure partnerId column exists before indexing (backfill for shadow DB replay safety)
ALTER TABLE "dist_distributors" ADD COLUMN IF NOT EXISTS "partnerId" TEXT;

-- CreateIndex: unique constraint on partnerId (was missing from prior migrations)
CREATE UNIQUE INDEX IF NOT EXISTS "dist_distributors_partnerId_key" ON "dist_distributors"("partnerId");

