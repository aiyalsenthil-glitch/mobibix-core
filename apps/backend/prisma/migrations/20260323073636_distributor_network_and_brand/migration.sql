
-- CreateEnum
CREATE TYPE "DistRefillStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'INVOICED', 'RECEIVED');

-- CreateEnum
CREATE TYPE "MilestoneMetric" AS ENUM ('REVENUE_TOTAL', 'REPAIRS_COUNT', 'SALES_COUNT', 'NEW_CUSTOMERS');

-- CreateEnum
CREATE TYPE "AutomationTrigger" AS ENUM ('INVOICE_CREATED', 'JOB_CARD_COMPLETED', 'PAYMENT_RECEIVED', 'LOW_STOCK_ALERT');

-- CreateEnum
CREATE TYPE "AutomationAction" AS ENUM ('SEND_WHATSAPP', 'ADD_LOYALTY_POINTS', 'CREATE_FOLLOW_UP', 'NOTIFY_STAFF');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CommissionScope" ADD VALUE 'CATEGORY_SPECIFIC';
ALTER TYPE "CommissionScope" ADD VALUE 'PRODUCT_SPECIFIC';

-- AlterEnum
ALTER TYPE "EarningStatus" ADD VALUE 'CANCELLED';

-- DropForeignKey
ALTER TABLE "mb_commission_rule" DROP CONSTRAINT "mb_commission_rule_shopId_fkey";

-- DropIndex
DROP INDEX "mb_commission_rule_tenantId_shopId_idx";

-- AlterTable
ALTER TABLE "dist_distributor_retailers" ADD COLUMN     "firstCommissionPct" DOUBLE PRECISION,
ADD COLUMN     "recurringCommissionPct" DOUBLE PRECISION,
ADD COLUMN     "stockVisibilityEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "dist_distributors" ADD COLUMN     "defaultFirstCommissionPct" DOUBLE PRECISION NOT NULL DEFAULT 30,
ADD COLUMN     "defaultRecurringCommissionPct" DOUBLE PRECISION NOT NULL DEFAULT 5;

-- AlterTable
ALTER TABLE "mb_commission_rule" ADD COLUMN     "description" TEXT,
ADD COLUMN     "minSaleAmount" INTEGER,
ADD COLUMN     "productId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3),
ALTER COLUMN "shopId" DROP NOT NULL;
-- Backfill updatedAt for any existing rows, then enforce NOT NULL
UPDATE "mb_commission_rule" SET "updatedAt" = NOW() WHERE "updatedAt" IS NULL;
ALTER TABLE "mb_commission_rule" ALTER COLUMN "updatedAt" SET NOT NULL;

-- AlterTable
ALTER TABLE "mb_shop_product" ADD COLUMN     "brand" TEXT;

-- CreateTable
CREATE TABLE "dist_stock_visibility" (
    "id" TEXT NOT NULL,
    "linkId" TEXT NOT NULL,
    "allowAllProducts" BOOLEAN NOT NULL DEFAULT false,
    "allowedCategories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "allowedBrands" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dist_stock_visibility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dist_refill_requests" (
    "id" TEXT NOT NULL,
    "linkId" TEXT NOT NULL,
    "status" "DistRefillStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "purchaseOrderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dist_refill_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dist_refill_request_items" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "catalogItemId" TEXT NOT NULL,
    "suggestedQty" INTEGER NOT NULL,
    "acceptedQty" INTEGER,

    CONSTRAINT "dist_refill_request_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dist_link_invites" (
    "id" TEXT NOT NULL,
    "distributorId" TEXT NOT NULL,
    "targetPhone" TEXT,
    "targetEmail" TEXT,
    "targetTenantId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dist_link_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mb_shop_target" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "revenueTarget" BIGINT NOT NULL,
    "repairTarget" INTEGER,
    "salesTarget" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mb_shop_target_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mb_staff_target" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "revenueTarget" BIGINT NOT NULL,
    "repairTarget" INTEGER,
    "salesTarget" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mb_staff_target_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mb_staff_milestone" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "metric" "MilestoneMetric" NOT NULL,
    "targetValue" INTEGER NOT NULL,
    "rewardAmount" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mb_staff_milestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mb_milestone_earning" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "rewardAmount" INTEGER NOT NULL,
    "achievedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mb_milestone_earning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mb_automation_rule" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trigger" "AutomationTrigger" NOT NULL,
    "action" "AutomationAction" NOT NULL,
    "conditions" JSONB,
    "actionConfig" JSONB,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mb_automation_rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mb_automation_log" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "triggerData" JSONB NOT NULL,
    "actionResults" JSONB,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mb_automation_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dist_stock_visibility_linkId_key" ON "dist_stock_visibility"("linkId");

-- CreateIndex
CREATE UNIQUE INDEX "dist_refill_requests_purchaseOrderId_key" ON "dist_refill_requests"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "dist_refill_requests_linkId_idx" ON "dist_refill_requests"("linkId");

-- CreateIndex
CREATE INDEX "dist_link_invites_distributorId_idx" ON "dist_link_invites"("distributorId");

-- CreateIndex
CREATE INDEX "dist_link_invites_targetPhone_idx" ON "dist_link_invites"("targetPhone");

-- CreateIndex
CREATE INDEX "dist_link_invites_targetEmail_idx" ON "dist_link_invites"("targetEmail");

-- CreateIndex
CREATE INDEX "mb_shop_target_tenantId_idx" ON "mb_shop_target"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "mb_shop_target_shopId_month_year_key" ON "mb_shop_target"("shopId", "month", "year");

-- CreateIndex
CREATE INDEX "mb_staff_target_tenantId_idx" ON "mb_staff_target"("tenantId");

-- CreateIndex
CREATE INDEX "mb_staff_target_shopId_idx" ON "mb_staff_target"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "mb_staff_target_staffId_month_year_key" ON "mb_staff_target"("staffId", "month", "year");

-- CreateIndex
CREATE INDEX "mb_staff_milestone_tenantId_idx" ON "mb_staff_milestone"("tenantId");

-- CreateIndex
CREATE INDEX "mb_milestone_earning_tenantId_idx" ON "mb_milestone_earning"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "mb_milestone_earning_staffId_milestoneId_key" ON "mb_milestone_earning"("staffId", "milestoneId");

-- CreateIndex
CREATE INDEX "mb_automation_rule_tenantId_idx" ON "mb_automation_rule"("tenantId");

-- CreateIndex
CREATE INDEX "mb_automation_log_tenantId_idx" ON "mb_automation_log"("tenantId");

-- CreateIndex
CREATE INDEX "mb_automation_log_ruleId_idx" ON "mb_automation_log"("ruleId");

-- CreateIndex
CREATE INDEX "mb_commission_rule_tenantId_idx" ON "mb_commission_rule"("tenantId");

-- CreateIndex
CREATE INDEX "mb_commission_rule_shopId_idx" ON "mb_commission_rule"("shopId");

-- AddForeignKey
ALTER TABLE "mb_commission_rule" ADD CONSTRAINT "mb_commission_rule_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "mb_shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dist_stock_visibility" ADD CONSTRAINT "dist_stock_visibility_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "dist_distributor_retailers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dist_refill_requests" ADD CONSTRAINT "dist_refill_requests_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "dist_distributor_retailers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dist_refill_request_items" ADD CONSTRAINT "dist_refill_request_items_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "dist_refill_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dist_refill_request_items" ADD CONSTRAINT "dist_refill_request_items_catalogItemId_fkey" FOREIGN KEY ("catalogItemId") REFERENCES "dist_catalog_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dist_link_invites" ADD CONSTRAINT "dist_link_invites_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "dist_distributors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_shop_target" ADD CONSTRAINT "mb_shop_target_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_shop_target" ADD CONSTRAINT "mb_shop_target_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "mb_shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_staff_target" ADD CONSTRAINT "mb_staff_target_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_staff_target" ADD CONSTRAINT "mb_staff_target_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "mb_shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_staff_milestone" ADD CONSTRAINT "mb_staff_milestone_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_milestone_earning" ADD CONSTRAINT "mb_milestone_earning_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "mb_staff_milestone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_milestone_earning" ADD CONSTRAINT "mb_milestone_earning_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_milestone_earning" ADD CONSTRAINT "mb_milestone_earning_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "mb_shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_automation_rule" ADD CONSTRAINT "mb_automation_rule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_automation_log" ADD CONSTRAINT "mb_automation_log_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "mb_automation_rule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_automation_log" ADD CONSTRAINT "mb_automation_log_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

