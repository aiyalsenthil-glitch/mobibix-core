/*
  Warnings:

  - You are about to drop the column `productId` on the `IMEI` table. All the data in the column will be lost.
  - You are about to drop the `InventoryProduct` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `InventoryStock` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `shopProductId` to the `IMEI` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `ShopProduct` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "IMEI" DROP CONSTRAINT "IMEI_productId_fkey";

-- DropForeignKey
ALTER TABLE "InventoryProduct" DROP CONSTRAINT "InventoryProduct_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "InventoryStock" DROP CONSTRAINT "InventoryStock_productId_fkey";

-- DropForeignKey
ALTER TABLE "InventoryStock" DROP CONSTRAINT "InventoryStock_tenantId_fkey";

-- DropIndex
DROP INDEX "IMEI_productId_idx";

-- AlterTable
ALTER TABLE "IMEI" DROP COLUMN "productId",
ADD COLUMN     "shopProductId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ShopProduct" ADD COLUMN     "type" "ProductType" NOT NULL;

-- DropTable
DROP TABLE "InventoryProduct";

-- DropTable
DROP TABLE "InventoryStock";

-- CreateIndex
CREATE INDEX "IMEI_shopProductId_idx" ON "IMEI"("shopProductId");

-- AddForeignKey
ALTER TABLE "IMEI" ADD CONSTRAINT "IMEI_shopProductId_fkey" FOREIGN KEY ("shopProductId") REFERENCES "ShopProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
