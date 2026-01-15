/*
  Warnings:

  - You are about to drop the column `expiryReminderSentAt` on the `TenantSubscription` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `TenantSubscription` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[provider,providerPaymentId,providerOrderId]` on the table `Payment` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Payment_provider_providerPaymentId_key";

-- DropIndex
DROP INDEX "TenantSubscription_tenantId_key";

-- AlterTable
ALTER TABLE "TenantSubscription" DROP COLUMN "expiryReminderSentAt",
DROP COLUMN "updatedAt";

-- CreateIndex
CREATE UNIQUE INDEX "Payment_provider_providerPaymentId_providerOrderId_key" ON "Payment"("provider", "providerPaymentId", "providerOrderId");

-- CreateIndex
CREATE INDEX "TenantSubscription_tenantId_idx" ON "TenantSubscription"("tenantId");

-- CreateIndex
CREATE INDEX "TenantSubscription_planId_idx" ON "TenantSubscription"("planId");
