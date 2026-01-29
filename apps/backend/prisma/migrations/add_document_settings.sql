-- Create enum for document types
CREATE TYPE "DocumentType" AS ENUM ('SALES_INVOICE', 'PURCHASE_INVOICE', 'JOB_CARD', 'QUOTATION', 'DELIVERY_NOTE', 'RECEIPT');

-- Create enum for year format
CREATE TYPE "YearFormat" AS ENUM ('FY', 'YYYY', 'YY', 'NONE');

-- Create enum for reset policy
CREATE TYPE "ResetPolicy" AS ENUM ('YEARLY', 'MONTHLY', 'NEVER');

-- Create ShopDocumentSetting table
CREATE TABLE "ShopDocumentSetting" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "documentType" "DocumentType" NOT NULL,
    "prefix" TEXT NOT NULL,
    "docCode" TEXT NOT NULL,
    "separator" TEXT NOT NULL DEFAULT '-',
    "yearFormat" "YearFormat" NOT NULL DEFAULT 'FY',
    "numberPadding" INTEGER NOT NULL DEFAULT 4,
    "startFrom" INTEGER NOT NULL DEFAULT 1,
    "resetPolicy" "ResetPolicy" NOT NULL DEFAULT 'YEARLY',
    "currentNumber" INTEGER NOT NULL DEFAULT 0,
    "currentYear" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopDocumentSetting_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint for shop + document type
CREATE UNIQUE INDEX "ShopDocumentSetting_shopId_documentType_key" ON "ShopDocumentSetting"("shopId", "documentType");

-- Create index for faster lookups
CREATE INDEX "ShopDocumentSetting_shopId_idx" ON "ShopDocumentSetting"("shopId");

-- Add foreign key constraint
ALTER TABLE "ShopDocumentSetting" ADD CONSTRAINT "ShopDocumentSetting_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
