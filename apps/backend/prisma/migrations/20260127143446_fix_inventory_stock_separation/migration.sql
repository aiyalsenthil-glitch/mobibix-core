/*
  Warnings:

  - You are about to drop the column `financialYear` on the `JobCard` table. All the data in the column will be lost.
  - You are about to drop the column `termsAndConditions` on the `Shop` table. All the data in the column will be lost.
  - You are about to drop the column `reservedStock` on the `ShopProduct` table. All the data in the column will be lost.
  - You are about to drop the column `serialNumber` on the `ShopProduct` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `IMEI` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `RepairPartUsed` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "IMEIStatus" AS ENUM ('IN_STOCK', 'SOLD', 'RETURNED', 'DAMAGED', 'TRANSFERRED', 'LOST');

-- DropIndex
DROP INDEX "ShopProduct_serialNumber_key";

-- AlterTable
ALTER TABLE "IMEI" ADD COLUMN     "damageNotes" TEXT,
ADD COLUMN     "returnedAt" TIMESTAMP(3),
ADD COLUMN     "soldAt" TIMESTAMP(3),
ADD COLUMN     "status" "IMEIStatus" NOT NULL DEFAULT 'IN_STOCK',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "JobCard" DROP COLUMN "financialYear";

-- AlterTable
ALTER TABLE "RepairPartUsed" ADD COLUMN     "costPerUnit" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Shop" DROP COLUMN "termsAndConditions";

-- AlterTable
ALTER TABLE "ShopProduct" DROP COLUMN "reservedStock",
DROP COLUMN "serialNumber",
ADD COLUMN     "isSerialized" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "StockLedger" ADD COLUMN     "costPerUnit" INTEGER;

-- CreateIndex
CREATE INDEX "IMEI_status_idx" ON "IMEI"("status");

-- CreateIndex
CREATE INDEX "IMEI_imei_idx" ON "IMEI"("imei");

-- CreateIndex
CREATE INDEX "RepairPartUsed_shopProductId_idx" ON "RepairPartUsed"("shopProductId");

-- CreateIndex
CREATE INDEX "StockLedger_referenceType_referenceId_idx" ON "StockLedger"("referenceType", "referenceId");
