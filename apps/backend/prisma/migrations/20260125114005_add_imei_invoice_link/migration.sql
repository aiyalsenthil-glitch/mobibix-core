/*
  Warnings:

  - A unique constraint covering the columns `[serialNumber]` on the table `ShopProduct` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "ProductType" ADD VALUE 'SPARE';

-- AlterTable
ALTER TABLE "IMEI" ADD COLUMN     "invoiceId" TEXT;

-- AlterTable
ALTER TABLE "ShopProduct" ADD COLUMN     "serialNumber" TEXT;

-- CreateIndex
CREATE INDEX "IMEI_invoiceId_idx" ON "IMEI"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopProduct_serialNumber_key" ON "ShopProduct"("serialNumber");

-- AddForeignKey
ALTER TABLE "IMEI" ADD CONSTRAINT "IMEI_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
