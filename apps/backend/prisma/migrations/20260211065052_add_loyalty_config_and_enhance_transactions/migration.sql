/*
  Warnings:

  - You are about to drop the column `referenceId` on the `LoyaltyTransaction` table. All the data in the column will be lost.
  - Added the required column `type` to the `LoyaltyTransaction` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "LoyaltyTransactionType" AS ENUM ('EARN', 'REDEEM', 'EXPIRE', 'MANUAL', 'REVERSAL');

-- AlterTable
ALTER TABLE "LoyaltyTransaction" DROP COLUMN "referenceId",
ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "invoiceId" TEXT,
ADD COLUMN     "reversalOf" TEXT,
ADD COLUMN     "type" "LoyaltyTransactionType" NOT NULL;

-- CreateTable
CREATE TABLE "LoyaltyConfig" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "earnAmountPerPoint" INTEGER NOT NULL DEFAULT 10000,
    "pointsPerEarnUnit" INTEGER NOT NULL DEFAULT 1,
    "pointValueInRupees" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "maxRedeemPercent" INTEGER NOT NULL DEFAULT 50,
    "allowOnRepairs" BOOLEAN NOT NULL DEFAULT true,
    "allowOnAccessories" BOOLEAN NOT NULL DEFAULT true,
    "allowOnServices" BOOLEAN NOT NULL DEFAULT false,
    "expiryDays" INTEGER,
    "allowManualAdjustment" BOOLEAN NOT NULL DEFAULT false,
    "minInvoiceForEarn" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoyaltyConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyConfig_tenantId_key" ON "LoyaltyConfig"("tenantId");

-- CreateIndex
CREATE INDEX "LoyaltyConfig_tenantId_idx" ON "LoyaltyConfig"("tenantId");

-- CreateIndex
CREATE INDEX "LoyaltyTransaction_invoiceId_idx" ON "LoyaltyTransaction"("invoiceId");

-- CreateIndex
CREATE INDEX "LoyaltyTransaction_reversalOf_idx" ON "LoyaltyTransaction"("reversalOf");

-- AddForeignKey
ALTER TABLE "LoyaltyConfig" ADD CONSTRAINT "LoyaltyConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
