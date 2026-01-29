/*
  Warnings:

  - You are about to drop the column `tenantId` on the `WhatsAppAutomation` table. All the data in the column will be lost.
  - You are about to drop the column `tenantId` on the `WhatsAppTemplate` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[moduleType,triggerType]` on the table `WhatsAppAutomation` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[moduleType,templateKey]` on the table `WhatsAppTemplate` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `moduleType` to the `WhatsAppAutomation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `moduleType` to the `WhatsAppTemplate` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "WhatsAppAutomation_tenantId_idx";

-- DropIndex
DROP INDEX "WhatsAppAutomation_tenantId_triggerType_key";

-- DropIndex
DROP INDEX "WhatsAppTemplate_tenantId_idx";

-- DropIndex
DROP INDEX "WhatsAppTemplate_tenantId_templateKey_key";

-- Step 1: Add moduleType column as nullable first
ALTER TABLE "WhatsAppAutomation" ADD COLUMN "moduleType" TEXT;
ALTER TABLE "WhatsAppTemplate" ADD COLUMN "moduleType" TEXT;

-- Step 2: Populate moduleType from Tenant.tenantType using tenantId
UPDATE "WhatsAppAutomation" 
SET "moduleType" = (
  SELECT "tenantType" 
  FROM "Tenant" 
  WHERE "Tenant"."id" = "WhatsAppAutomation"."tenantId"
);

UPDATE "WhatsAppTemplate" 
SET "moduleType" = (
  SELECT "tenantType" 
  FROM "Tenant" 
  WHERE "Tenant"."id" = "WhatsAppTemplate"."tenantId"
);

-- Step 3: Make moduleType NOT NULL
ALTER TABLE "WhatsAppAutomation" ALTER COLUMN "moduleType" SET NOT NULL;
ALTER TABLE "WhatsAppTemplate" ALTER COLUMN "moduleType" SET NOT NULL;

-- Step 4: Drop tenantId column
ALTER TABLE "WhatsAppAutomation" DROP COLUMN "tenantId";
ALTER TABLE "WhatsAppTemplate" DROP COLUMN "tenantId";

-- CreateIndex
CREATE INDEX "WhatsAppAutomation_moduleType_idx" ON "WhatsAppAutomation"("moduleType");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppAutomation_moduleType_triggerType_key" ON "WhatsAppAutomation"("moduleType", "triggerType");

-- CreateIndex
CREATE INDEX "WhatsAppTemplate_moduleType_idx" ON "WhatsAppTemplate"("moduleType");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppTemplate_moduleType_templateKey_key" ON "WhatsAppTemplate"("moduleType", "templateKey");
