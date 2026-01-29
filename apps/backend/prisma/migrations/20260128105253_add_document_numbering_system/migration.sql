-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('SALES_INVOICE', 'PURCHASE_INVOICE', 'JOB_CARD', 'RECEIPT', 'QUOTATION', 'PURCHASE_ORDER');

-- CreateEnum
CREATE TYPE "YearFormat" AS ENUM ('FY', 'YYYY', 'YY', 'NONE');

-- CreateEnum
CREATE TYPE "ResetPolicy" AS ENUM ('NEVER', 'YEARLY', 'MONTHLY');

-- CreateTable
CREATE TABLE "ShopDocumentSetting" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "documentType" "DocumentType" NOT NULL,
    "prefix" TEXT NOT NULL,
    "separator" TEXT NOT NULL DEFAULT '-',
    "documentCode" TEXT NOT NULL,
    "yearFormat" "YearFormat" NOT NULL DEFAULT 'FY',
    "numberLength" INTEGER NOT NULL DEFAULT 4,
    "resetPolicy" "ResetPolicy" NOT NULL DEFAULT 'YEARLY',
    "currentNumber" INTEGER NOT NULL DEFAULT 0,
    "currentYear" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopDocumentSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShopDocumentSetting_shopId_idx" ON "ShopDocumentSetting"("shopId");

-- CreateIndex
CREATE INDEX "ShopDocumentSetting_documentType_idx" ON "ShopDocumentSetting"("documentType");

-- CreateIndex
CREATE UNIQUE INDEX "ShopDocumentSetting_shopId_documentType_key" ON "ShopDocumentSetting"("shopId", "documentType");

-- AddForeignKey
ALTER TABLE "ShopDocumentSetting" ADD CONSTRAINT "ShopDocumentSetting_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
