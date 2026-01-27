/*
  Warnings:

  - You are about to drop the column `stockOnHand` on the `ShopProduct` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[tenantId,imei]` on the table `IMEI` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "IMEI_imei_idx";

-- DropIndex
DROP INDEX "IMEI_imei_key";

-- AlterTable
ALTER TABLE "IMEI" ADD COLUMN     "lostReason" TEXT,
ADD COLUMN     "transferredToShopId" TEXT;

-- AlterTable
ALTER TABLE "ShopProduct" DROP COLUMN "stockOnHand";

-- CreateIndex
CREATE INDEX "IMEI_transferredToShopId_idx" ON "IMEI"("transferredToShopId");

-- CreateIndex
CREATE UNIQUE INDEX "IMEI_tenantId_imei_key" ON "IMEI"("tenantId", "imei");

-- AddForeignKey
ALTER TABLE "IMEI" ADD CONSTRAINT "IMEI_transferredToShopId_fkey" FOREIGN KEY ("transferredToShopId") REFERENCES "Shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;
