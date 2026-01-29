/*
  Warnings:

  - A unique constraint covering the columns `[moduleType,metaTemplateName]` on the table `WhatsAppTemplate` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "DocumentType" ADD VALUE 'PAYMENT_VOUCHER';

-- DropIndex
DROP INDEX "WhatsAppTemplate_moduleType_templateKey_key";

-- AlterTable
ALTER TABLE "Shop" ALTER COLUMN "jobCardPrinterType" SET DEFAULT 'NORMAL',
ALTER COLUMN "jobCardTemplate" SET DEFAULT 'SIMPLE';

-- AlterTable
ALTER TABLE "WhatsAppTemplate" ADD COLUMN     "isDefault" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "WhatsAppTemplate_moduleType_templateKey_idx" ON "WhatsAppTemplate"("moduleType", "templateKey");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppTemplate_moduleType_metaTemplateName_key" ON "WhatsAppTemplate"("moduleType", "metaTemplateName");
