/*
  Warnings:

  - You are about to drop the column `financialYear` on the `JobCard` table. All the data in the column will be lost.
  - You are about to drop the column `termsAndConditions` on the `Shop` table. All the data in the column will be lost.
  - You are about to drop the column `reservedStock` on the `ShopProduct` table. All the data in the column will be lost.
  - You are about to drop the column `serialNumber` on the `ShopProduct` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `IMEI` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `RepairPartUsed` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum (guarded)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'IMEIStatus') THEN
    CREATE TYPE "IMEIStatus" AS ENUM ('IN_STOCK', 'SOLD', 'RETURNED', 'DAMAGED', 'TRANSFERRED', 'LOST');
  END IF;
END $$;

-- DropIndex
DROP INDEX IF EXISTS "ShopProduct_serialNumber_key";

-- AlterTable (IMEI)
ALTER TABLE "IMEI" ADD COLUMN IF NOT EXISTS "damageNotes" TEXT;
ALTER TABLE "IMEI" ADD COLUMN IF NOT EXISTS "returnedAt" TIMESTAMP(3);
ALTER TABLE "IMEI" ADD COLUMN IF NOT EXISTS "soldAt" TIMESTAMP(3);
ALTER TABLE "IMEI" ADD COLUMN IF NOT EXISTS "status" "IMEIStatus" NOT NULL DEFAULT 'IN_STOCK';
ALTER TABLE "IMEI" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "JobCard" DROP COLUMN IF EXISTS "financialYear";

-- AlterTable (RepairPartUsed)
ALTER TABLE "RepairPartUsed" ADD COLUMN IF NOT EXISTS "costPerUnit" INTEGER;
ALTER TABLE "RepairPartUsed" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Shop" DROP COLUMN IF EXISTS "termsAndConditions";

-- AlterTable
ALTER TABLE "ShopProduct" DROP COLUMN IF EXISTS "reservedStock",
DROP COLUMN IF EXISTS "serialNumber",
ADD COLUMN IF NOT EXISTS "isSerialized" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "StockLedger" ADD COLUMN IF NOT EXISTS "costPerUnit" INTEGER;

-- Align defaults with schema (no default for updatedAt)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'IMEI' AND column_name = 'updatedAt'
  ) THEN
    ALTER TABLE "IMEI" ALTER COLUMN "updatedAt" DROP DEFAULT;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'RepairPartUsed' AND column_name = 'updatedAt'
  ) THEN
    ALTER TABLE "RepairPartUsed" ALTER COLUMN "updatedAt" DROP DEFAULT;
  END IF;
END $$;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "IMEI_status_idx" ON "IMEI"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "IMEI_imei_idx" ON "IMEI"("imei");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RepairPartUsed_shopProductId_idx" ON "RepairPartUsed"("shopProductId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "StockLedger_referenceType_referenceId_idx" ON "StockLedger"("referenceType", "referenceId");
