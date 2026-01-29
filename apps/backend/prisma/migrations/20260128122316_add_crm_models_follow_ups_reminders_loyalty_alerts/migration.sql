/*
  Warnings:

  - You are about to drop the column `tenantProductId` on the `ShopProduct` table. All the data in the column will be lost.
  - You are about to drop the `TenantProduct` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "FollowUpType" AS ENUM ('CALL', 'WHATSAPP', 'VISIT', 'EMAIL', 'SMS');

-- CreateEnum
CREATE TYPE "FollowUpPurpose" AS ENUM ('SALE', 'SERVICE', 'PAYMENT', 'FEEDBACK', 'RETENTION', 'OTHER');

-- CreateEnum
CREATE TYPE "FollowUpStatus" AS ENUM ('PENDING', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReminderTriggerType" AS ENUM ('DATE', 'AFTER_INVOICE', 'AFTER_JOB');

-- CreateEnum
CREATE TYPE "ReminderChannel" AS ENUM ('WHATSAPP', 'IN_APP', 'EMAIL', 'SMS');

-- CreateEnum
CREATE TYPE "ReminderStatus" AS ENUM ('SCHEDULED', 'SENT', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "LoyaltySource" AS ENUM ('INVOICE', 'MANUAL', 'PROMOTION', 'REFERRAL', 'REDEMPTION');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AlertSource" AS ENUM ('OVERDUE', 'HIGH_VALUE', 'REPEAT_REPAIR', 'CHURN_RISK', 'INACTIVE', 'CUSTOM');

-- DropForeignKey
ALTER TABLE "ShopProduct" DROP CONSTRAINT "ShopProduct_tenantProductId_fkey";

-- DropForeignKey
ALTER TABLE "TenantProduct" DROP CONSTRAINT "TenantProduct_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "TenantProduct" DROP CONSTRAINT "TenantProduct_hsnId_fkey";

-- DropForeignKey
ALTER TABLE "TenantProduct" DROP CONSTRAINT "TenantProduct_tenantId_fkey";

-- DropIndex
DROP INDEX "ShopProduct_tenantProductId_idx";

-- AlterTable
ALTER TABLE "Shop" ADD COLUMN     "headerConfig" JSONB,
ADD COLUMN     "invoicePrinterType" TEXT DEFAULT 'NORMAL',
ADD COLUMN     "invoiceTemplate" TEXT DEFAULT 'CLASSIC',
ADD COLUMN     "jobCardPrinterType" TEXT DEFAULT 'THERMAL',
ADD COLUMN     "jobCardTemplate" TEXT DEFAULT 'THERMAL',
ADD COLUMN     "tagline" TEXT;

-- AlterTable
ALTER TABLE "ShopProduct" DROP COLUMN "tenantProductId";

-- DropTable
DROP TABLE "TenantProduct";

-- CreateTable
CREATE TABLE "CustomerFollowUp" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "shopId" TEXT,
    "type" "FollowUpType" NOT NULL,
    "purpose" "FollowUpPurpose" NOT NULL,
    "note" TEXT,
    "followUpAt" TIMESTAMP(3) NOT NULL,
    "status" "FollowUpStatus" NOT NULL DEFAULT 'PENDING',
    "assignedToUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerFollowUp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerReminder" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "triggerType" "ReminderTriggerType" NOT NULL,
    "triggerValue" TEXT NOT NULL,
    "channel" "ReminderChannel" NOT NULL,
    "templateKey" TEXT NOT NULL,
    "status" "ReminderStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerReminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoyaltyTransaction" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "source" "LoyaltySource" NOT NULL,
    "referenceId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoyaltyTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerAlert" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "message" TEXT NOT NULL,
    "source" "AlertSource" NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomerFollowUp_tenantId_idx" ON "CustomerFollowUp"("tenantId");

-- CreateIndex
CREATE INDEX "CustomerFollowUp_customerId_idx" ON "CustomerFollowUp"("customerId");

-- CreateIndex
CREATE INDEX "CustomerFollowUp_shopId_idx" ON "CustomerFollowUp"("shopId");

-- CreateIndex
CREATE INDEX "CustomerFollowUp_assignedToUserId_idx" ON "CustomerFollowUp"("assignedToUserId");

-- CreateIndex
CREATE INDEX "CustomerFollowUp_followUpAt_idx" ON "CustomerFollowUp"("followUpAt");

-- CreateIndex
CREATE INDEX "CustomerFollowUp_status_idx" ON "CustomerFollowUp"("status");

-- CreateIndex
CREATE INDEX "CustomerReminder_tenantId_idx" ON "CustomerReminder"("tenantId");

-- CreateIndex
CREATE INDEX "CustomerReminder_customerId_idx" ON "CustomerReminder"("customerId");

-- CreateIndex
CREATE INDEX "CustomerReminder_status_idx" ON "CustomerReminder"("status");

-- CreateIndex
CREATE INDEX "CustomerReminder_scheduledAt_idx" ON "CustomerReminder"("scheduledAt");

-- CreateIndex
CREATE INDEX "LoyaltyTransaction_tenantId_idx" ON "LoyaltyTransaction"("tenantId");

-- CreateIndex
CREATE INDEX "LoyaltyTransaction_customerId_idx" ON "LoyaltyTransaction"("customerId");

-- CreateIndex
CREATE INDEX "LoyaltyTransaction_createdAt_idx" ON "LoyaltyTransaction"("createdAt");

-- CreateIndex
CREATE INDEX "CustomerAlert_tenantId_idx" ON "CustomerAlert"("tenantId");

-- CreateIndex
CREATE INDEX "CustomerAlert_customerId_idx" ON "CustomerAlert"("customerId");

-- CreateIndex
CREATE INDEX "CustomerAlert_severity_idx" ON "CustomerAlert"("severity");

-- CreateIndex
CREATE INDEX "CustomerAlert_resolved_idx" ON "CustomerAlert"("resolved");

-- CreateIndex
CREATE INDEX "CustomerAlert_createdAt_idx" ON "CustomerAlert"("createdAt");

-- CreateIndex
CREATE INDEX "ShopProduct_globalProductId_idx" ON "ShopProduct"("globalProductId");

-- AddForeignKey
ALTER TABLE "CustomerFollowUp" ADD CONSTRAINT "CustomerFollowUp_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerFollowUp" ADD CONSTRAINT "CustomerFollowUp_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerFollowUp" ADD CONSTRAINT "CustomerFollowUp_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerFollowUp" ADD CONSTRAINT "CustomerFollowUp_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerReminder" ADD CONSTRAINT "CustomerReminder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerReminder" ADD CONSTRAINT "CustomerReminder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyTransaction" ADD CONSTRAINT "LoyaltyTransaction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyTransaction" ADD CONSTRAINT "LoyaltyTransaction_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerAlert" ADD CONSTRAINT "CustomerAlert_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerAlert" ADD CONSTRAINT "CustomerAlert_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
