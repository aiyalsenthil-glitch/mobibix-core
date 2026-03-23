/*
  Warnings:

  - The values [CALL] on the enum `FollowUpType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `accepted` on the `StaffInvite` table. All the data in the column will be lost.
  - You are about to alter the column `value` on the `mb_commission_rule` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Decimal(65,30)`.
  - You are about to alter the column `interestRate` on the `mb_emi_application` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Decimal(65,30)`.
  - You are about to drop the column `loyaltyPoints` on the `mb_party` table. All the data in the column will be lost.
  - You are about to drop the `WhatsAppPhoneNumberModule` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[planId,billingCycle,currency]` on the table `PlanPrice` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[inviteToken]` on the table `StaffInvite` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenantId,email,status]` on the table `StaffInvite` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenantId,module,endDate]` on the table `TenantSubscription` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[phoneNumberId]` on the table `WhatsAppPhoneNumber` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenantId,invoiceNumber]` on the table `mb_invoice` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[shopId]` on the table `mb_loyalty_config` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenantId,normalizedPhone]` on the table `mb_party` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenantId,invoiceNumber]` on the table `mb_purchase` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenantId,shopId,sku]` on the table `mb_shop_product` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,tenantId,shopId]` on the table `mb_shop_staff` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `WebhookEvent` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `purpose` on the `mb_customer_follow_up` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "BillingType" AS ENUM ('MANUAL', 'AUTOPAY');

-- CreateEnum
CREATE TYPE "AutopayStatus" AS ENUM ('ACTIVE', 'HALTED', 'CANCELLED', 'PAST_DUE');

-- CreateEnum
CREATE TYPE "DeletionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'PENDING_DELETION', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'FAILED');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'WHATSAPP', 'IN_APP');

-- CreateEnum
CREATE TYPE "StaffInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PaymentRetryStatus" AS ENUM ('PENDING', 'PROCESSED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SubscriptionInvoiceStatus" AS ENUM ('DRAFT', 'FINALIZED', 'SENT', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RepairKnowledgeStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RepairKnowledgeSource" AS ENUM ('SYSTEM', 'ADMIN', 'COMMUNITY');

-- CreateEnum
CREATE TYPE "GRNStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CustomerLifecycle" AS ENUM ('PROSPECT', 'ACTIVE', 'INACTIVE', 'CHURNED');

-- CreateEnum
CREATE TYPE "FeatureFlagScope" AS ENUM ('GLOBAL', 'TENANT', 'SHOP');

-- CreateEnum
CREATE TYPE "PartType" AS ENUM ('TEMPERED_GLASS', 'DISPLAY', 'BATTERY', 'BACK_COVER', 'CHARGING_BOARD', 'CAMERA', 'IC', 'TOUCH_GLASS', 'FLEX_CABLE', 'FRAME', 'SPEAKER', 'GENERAL');

-- CreateEnum
CREATE TYPE "FeedbackType" AS ENUM ('REPORT_ERROR', 'SUGGEST_LINK');

-- CreateEnum
CREATE TYPE "FeedbackStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "WebhookStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'IGNORED');

-- CreateEnum
CREATE TYPE "EmailRecipientType" AS ENUM ('TENANT', 'STAFF', 'CUSTOMER');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "SystemRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "RoleCategory" AS ENUM ('SYSTEM_TEMPLATE', 'CUSTOM', 'CLONE');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LinkStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "B2BPOStatus" AS ENUM ('SUBMITTED', 'ACCEPTED', 'SHIPPED', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PartnerType" AS ENUM ('DISTRIBUTOR', 'ACADEMY', 'HARDWARE');

-- CreateEnum
CREATE TYPE "PartnerStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "PromoCodeType" AS ENUM ('FREE_TRIAL', 'DISCOUNT', 'SUBSCRIPTION_BONUS');

-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PAID');

-- CreateEnum
CREATE TYPE "PartnerNotificationType" AS ENUM ('PROMO_USED', 'COMMISSION_EARNED', 'COMMISSION_PAID', 'SUBSCRIPTION_EXPIRING', 'SUBSCRIPTION_RENEWED');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'FINANCE_ADMIN', 'SUPPORT_ADMIN', 'PRODUCT_ADMIN');

-- CreateEnum
CREATE TYPE "WaitlistSource" AS ENUM ('FEATURES_PAGE', 'APP_DASHBOARD', 'OTHER');

-- CreateEnum
CREATE TYPE "QuotationConversionType" AS ENUM ('INVOICE', 'JOB_CARD');

-- CreateEnum
CREATE TYPE "CreditNoteType" AS ENUM ('CUSTOMER', 'SUPPLIER');

-- CreateEnum
CREATE TYPE "CreditNoteReason" AS ENUM ('SALES_RETURN', 'PURCHASE_RETURN', 'PRICE_ADJUSTMENT', 'DISCOUNT_POST_SALE', 'OVERBILLING', 'WARRANTY_CLAIM');

-- CreateEnum
CREATE TYPE "CreditNoteStatus" AS ENUM ('DRAFT', 'ISSUED', 'PARTIALLY_APPLIED', 'FULLY_APPLIED', 'REFUNDED', 'VOIDED');

-- CreateEnum
CREATE TYPE "DailyClosingStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'REOPENED');

-- CreateEnum
CREATE TYPE "CashClosingMode" AS ENUM ('DAILY_ONLY', 'SHIFT_AND_DAILY');

-- CreateEnum
CREATE TYPE "ShiftClosingStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "AdjustmentReason" AS ENUM ('BREAKAGE', 'DAMAGE', 'LOST', 'INTERNAL_USE', 'CORRECTION', 'SPARE_DAMAGE');

-- CreateEnum
CREATE TYPE "StockVerificationStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CashVarianceStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DailyClosingMode" AS ENUM ('SYSTEM', 'MANUAL');

-- CreateEnum
CREATE TYPE "ChurnRisk" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- AlterEnum
ALTER TYPE "DocumentType" ADD VALUE 'CREDIT_NOTE';

-- AlterEnum
BEGIN;
CREATE TYPE "FollowUpType_new" AS ENUM ('PHONE_CALL', 'WHATSAPP', 'VISIT', 'EMAIL', 'SMS');
ALTER TABLE "mb_customer_follow_up" ALTER COLUMN "type" TYPE "FollowUpType_new" USING ("type"::text::"FollowUpType_new");
ALTER TYPE "FollowUpType" RENAME TO "FollowUpType_old";
ALTER TYPE "FollowUpType_new" RENAME TO "FollowUpType";
DROP TYPE "public"."FollowUpType_old";
COMMIT;

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "IMEIStatus" ADD VALUE 'RESERVED';
ALTER TYPE "IMEIStatus" ADD VALUE 'RETURNED_GOOD';
ALTER TYPE "IMEIStatus" ADD VALUE 'RETURNED_DAMAGED';
ALTER TYPE "IMEIStatus" ADD VALUE 'SCRAPPED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "JobStatus" ADD VALUE 'SCRAPPED';
ALTER TYPE "JobStatus" ADD VALUE 'REPAIR_FAILED';
ALTER TYPE "JobStatus" ADD VALUE 'WAITING_CUSTOMER';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LoyaltySource" ADD VALUE 'SYSTEM';
ALTER TYPE "LoyaltySource" ADD VALUE 'EXPIRED';

-- AlterEnum
ALTER TYPE "ModuleType" ADD VALUE 'CORE';

-- AlterEnum
ALTER TYPE "POStatus" ADD VALUE 'DISPATCHED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PaymentStatus" ADD VALUE 'REFUNDED';
ALTER TYPE "PaymentStatus" ADD VALUE 'DISPUTED';
ALTER TYPE "PaymentStatus" ADD VALUE 'CHARGEBACK';

-- AlterEnum
ALTER TYPE "QuotationStatus" ADD VALUE 'CONVERTED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UserRole" ADD VALUE 'MANAGER';
ALTER TYPE "UserRole" ADD VALUE 'TECHNICIAN';
ALTER TYPE "UserRole" ADD VALUE 'ACCOUNTANT';
ALTER TYPE "UserRole" ADD VALUE 'SUPERVISOR';

-- DropIndex
DROP INDEX "PlanPrice_planId_billingCycle_key";

-- DropIndex
DROP INDEX "StaffInvite_accepted_idx";

-- DropIndex
DROP INDEX "StaffInvite_tenantId_email_key";

-- DropIndex
DROP INDEX "TenantSubscription_tenantId_module_key";

-- DropIndex
DROP INDEX "WhatsAppPhoneNumber_tenantId_phoneNumberId_key";

-- DropIndex
DROP INDEX "WhatsAppPhoneNumber_tenantId_purpose_idx";

-- DropIndex
DROP INDEX "LoyaltyConfig_tenantId_key";

-- DropIndex
DROP INDEX "Purchase_shopId_invoiceNumber_key";

-- DropIndex
DROP INDEX "ShopStaff_userId_shopId_key";

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "module" "ModuleType" NOT NULL DEFAULT 'MOBILE_SHOP';

-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "maxAiTokens" INTEGER NOT NULL DEFAULT 100;

-- AlterTable
ALTER TABLE "PlanPrice" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'INR',
ADD COLUMN     "REMOVED_PAYMENT_INFRAPlanId" TEXT;

-- AlterTable
ALTER TABLE "StaffInvite" DROP COLUMN "accepted",
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedBy" TEXT,
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "inviteToken" TEXT,
ADD COLUMN     "roleId" TEXT,
ADD COLUMN     "shopIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "status" "StaffInviteStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "updatedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "acceptedPolicyVersion" TEXT,
ADD COLUMN     "businessCategoryId" TEXT,
ADD COLUMN     "consentIpAddress" TEXT,
ADD COLUMN     "consentUserAgent" TEXT,
ADD COLUMN     "deletionRequestPending" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "deletionScheduledAt" TIMESTAMP(3),
ADD COLUMN     "domain" TEXT,
ADD COLUMN     "enabledModules" "ModuleType"[],
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "marketingConsent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "partnerId" TEXT,
ADD COLUMN     "privacyAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "promoCodeId" TEXT,
ADD COLUMN     "stateCode" TEXT,
ADD COLUMN     "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "taxSystem" TEXT NOT NULL DEFAULT 'GST',
ADD COLUMN     "termsAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "whatsappBusinessId" TEXT,
ADD COLUMN     "whatsappReminderNumberId" TEXT,
ADD COLUMN     "whatsappWabaId" TEXT;

-- AlterTable
ALTER TABLE "TenantSubscription" ADD COLUMN     "aiTokensUsed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "autopayStatus" "AutopayStatus",
ADD COLUMN     "billingType" "BillingType" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "lastQuotaResetAt" TIMESTAMP(6),
ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "providerPaymentLinkId" TEXT,
ADD COLUMN     "providerSubscriptionId" TEXT,
ALTER COLUMN "autoRenew" SET DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "marketingConsent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "privacyAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "tokenVersion" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "UserTenant" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isSystemOwner" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "role" SET DEFAULT 'STAFF';

-- AlterTable
ALTER TABLE "WebhookEvent" ADD COLUMN     "error" TEXT,
ADD COLUMN     "processedAt" TIMESTAMP(3),
ADD COLUMN     "retryCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "status" "WebhookStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "WhatsAppLog" ADD COLUMN     "whatsAppNumberId" TEXT;

-- AlterTable
ALTER TABLE "WhatsAppMessageLog" ALTER COLUMN "phoneNumber" DROP NOT NULL;

-- AlterTable
ALTER TABLE "WhatsAppPhoneNumber" ADD COLUMN     "displayNumber" TEXT,
ADD COLUMN     "isSystem" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "label" TEXT,
ADD COLUMN     "moduleType" "ModuleType",
ALTER COLUMN "tenantId" DROP NOT NULL,
ALTER COLUMN "tokenExpiresAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "gp_gym_attendance" RENAME CONSTRAINT "GymAttendance_pkey" TO "gp_gym_attendance_pkey";

-- AlterTable
ALTER TABLE "gp_gym_membership" RENAME CONSTRAINT "GymMembership_pkey" TO "gp_gym_membership_pkey";

-- AlterTable
ALTER TABLE "gp_member" RENAME CONSTRAINT "Member_pkey" TO "gp_member_pkey";
ALTER TABLE "gp_member" ADD COLUMN     "contactId" TEXT;

-- AlterTable
ALTER TABLE "gp_member_payment" RENAME CONSTRAINT "MemberPayment_pkey" TO "gp_member_payment_pkey";

-- AlterTable
ALTER TABLE "lg_ledger_account" RENAME CONSTRAINT "LedgerAccount_pkey" TO "lg_ledger_account_pkey";

-- AlterTable
ALTER TABLE "lg_ledger_collection" RENAME CONSTRAINT "LedgerCollection_pkey" TO "lg_ledger_collection_pkey";

-- AlterTable
ALTER TABLE "lg_ledger_customer" RENAME CONSTRAINT "LedgerCustomer_pkey" TO "lg_ledger_customer_pkey";
ALTER TABLE "lg_ledger_customer" ADD COLUMN     "customerId" TEXT;

-- AlterTable
ALTER TABLE "lg_ledger_payment" RENAME CONSTRAINT "LedgerPayment_pkey" TO "lg_ledger_payment_pkey";

-- AlterTable
ALTER TABLE "mb_advance_application" RENAME CONSTRAINT "AdvanceApplication_pkey" TO "mb_advance_application_pkey";

-- AlterTable
ALTER TABLE "mb_audit_log" RENAME CONSTRAINT "AuditLog_pkey" TO "mb_audit_log_pkey";

-- AlterTable
ALTER TABLE "mb_commission_rule" ALTER COLUMN "value" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "mb_customer_alert" RENAME CONSTRAINT "CustomerAlert_pkey" TO "mb_customer_alert_pkey";

-- AlterTable
ALTER TABLE "mb_customer_follow_up" RENAME CONSTRAINT "CustomerFollowUp_pkey" TO "mb_customer_follow_up_pkey";
ALTER TABLE "mb_customer_follow_up" ADD COLUMN     "sourceJobId" TEXT,
ADD COLUMN     "sourceQuotationId" TEXT,
DROP COLUMN "purpose",
ADD COLUMN     "purpose" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "mb_customer_reminder" RENAME CONSTRAINT "CustomerReminder_pkey" TO "mb_customer_reminder_pkey";

-- AlterTable
ALTER TABLE "mb_emi_application" ALTER COLUMN "interestRate" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "mb_eway_bill" ALTER COLUMN "ewbDate" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "validUpto" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "generatedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "cancelledAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "mb_financial_entry" RENAME CONSTRAINT "FinancialEntry_pkey" TO "mb_financial_entry_pkey";

-- AlterTable
ALTER TABLE "mb_global_product" RENAME CONSTRAINT "GlobalProduct_pkey" TO "mb_global_product_pkey";

-- AlterTable
ALTER TABLE "mb_h_s_n_code" RENAME CONSTRAINT "HSNCode_pkey" TO "mb_h_s_n_code_pkey";

-- AlterTable
ALTER TABLE "mb_i_m_e_i" RENAME CONSTRAINT "IMEI_pkey" TO "mb_i_m_e_i_pkey";

-- AlterTable
ALTER TABLE "mb_installment_plan" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "mb_invoice" RENAME CONSTRAINT "Invoice_pkey" TO "mb_invoice_pkey";
ALTER TABLE "mb_invoice" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'INR',
ADD COLUMN     "shopGstin" TEXT,
ADD COLUMN     "taxDetails" JSONB;

-- AlterTable
ALTER TABLE "mb_invoice_item" RENAME CONSTRAINT "InvoiceItem_pkey" TO "mb_invoice_item_pkey";
ALTER TABLE "mb_invoice_item" ADD COLUMN     "costAtSale" INTEGER,
ADD COLUMN     "serialNumbers" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "taxDetails" JSONB,
ADD COLUMN     "warrantyDays" INTEGER,
ADD COLUMN     "warrantyEndAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "mb_job_card" RENAME CONSTRAINT "JobCard_pkey" TO "mb_job_card_pkey";
ALTER TABLE "mb_job_card" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedBy" TEXT,
ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ADD COLUMN     "faultTypeId" TEXT,
ADD COLUMN     "laborCharge" INTEGER DEFAULT 0,
ADD COLUMN     "qcCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "scrappedAt" TIMESTAMP(3),
ADD COLUMN     "suggestedFaultTypeId" TEXT;

-- AlterTable
ALTER TABLE "mb_job_card_part" RENAME CONSTRAINT "JobCardPart_pkey" TO "mb_job_card_part_pkey";
ALTER TABLE "mb_job_card_part" ADD COLUMN     "isDeducted" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "costPrice" DROP DEFAULT;

-- AlterTable
ALTER TABLE "mb_loyalty_config" RENAME CONSTRAINT "LoyaltyConfig_pkey" TO "mb_loyalty_config_pkey";
ALTER TABLE "mb_loyalty_config" ADD COLUMN     "shopId" TEXT;

-- AlterTable
ALTER TABLE "mb_loyalty_transaction" RENAME CONSTRAINT "LoyaltyTransaction_pkey" TO "mb_loyalty_transaction_pkey";
ALTER TABLE "mb_loyalty_transaction" ADD COLUMN     "referenceId" TEXT,
ADD COLUMN     "shopId" TEXT;

-- AlterTable
ALTER TABLE "mb_party" RENAME CONSTRAINT "Party_pkey" TO "mb_party_pkey";
ALTER TABLE "mb_party" DROP COLUMN "loyaltyPoints",
ADD COLUMN     "contactId" TEXT,
ADD COLUMN     "countryCode" TEXT NOT NULL DEFAULT 'IN',
ADD COLUMN     "currentOutstanding" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "customerLifecycle" "CustomerLifecycle",
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedBy" TEXT,
ADD COLUMN     "isoStateCode" TEXT,
ADD COLUMN     "mergedIntoId" TEXT,
ADD COLUMN     "normalizedPhone" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "mb_payment_voucher" RENAME CONSTRAINT "PaymentVoucher_pkey" TO "mb_payment_voucher_pkey";
ALTER TABLE "mb_payment_voucher" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "expenseCategoryId" TEXT,
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "updatedBy" TEXT;

-- AlterTable
ALTER TABLE "mb_product_category" RENAME CONSTRAINT "ProductCategory_pkey" TO "mb_product_category_pkey";

-- AlterTable
ALTER TABLE "mb_purchase" RENAME CONSTRAINT "Purchase_pkey" TO "mb_purchase_pkey";
ALTER TABLE "mb_purchase" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'INR',
ADD COLUMN     "exchangeRate" DECIMAL(18,6) NOT NULL DEFAULT 1.0,
ADD COLUMN     "poId" TEXT,
ADD COLUMN     "taxDetails" JSONB;

-- AlterTable
ALTER TABLE "mb_purchase_item" RENAME CONSTRAINT "PurchaseItem_pkey" TO "mb_purchase_item_pkey";
ALTER TABLE "mb_purchase_item" ADD COLUMN     "taxDetails" JSONB;

-- AlterTable
ALTER TABLE "mb_purchase_order" RENAME CONSTRAINT "PurchaseOrder_pkey" TO "mb_purchase_order_pkey";
ALTER TABLE "mb_purchase_order" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'INR',
ADD COLUMN     "exchangeRate" DECIMAL(18,6) NOT NULL DEFAULT 1.0,
ADD COLUMN     "paymentDueDays" INTEGER NOT NULL DEFAULT 30;

-- AlterTable
ALTER TABLE "mb_purchase_order_item" RENAME CONSTRAINT "PurchaseOrderItem_pkey" TO "mb_purchase_order_item_pkey";
ALTER TABLE "mb_purchase_order_item" ADD COLUMN     "uom" TEXT DEFAULT 'pcs';

-- AlterTable
ALTER TABLE "mb_quotation" RENAME CONSTRAINT "Quotation_pkey" TO "mb_quotation_pkey";
ALTER TABLE "mb_quotation" ADD COLUMN     "conversionType" "QuotationConversionType",
ADD COLUMN     "convertedAt" TIMESTAMP(3),
ADD COLUMN     "convertedBy" TEXT,
ADD COLUMN     "customerPhone" TEXT,
ADD COLUMN     "gstAmount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "linkedInvoiceId" TEXT,
ADD COLUMN     "linkedJobCardId" TEXT,
ADD COLUMN     "subTotal" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "mb_quotation_item" RENAME CONSTRAINT "QuotationItem_pkey" TO "mb_quotation_item_pkey";
ALTER TABLE "mb_quotation_item" ADD COLUMN     "gstAmount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "gstRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "lineTotal" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "shopProductId" TEXT;

-- AlterTable
ALTER TABLE "mb_receipt" RENAME CONSTRAINT "Receipt_pkey" TO "mb_receipt_pkey";

-- AlterTable
ALTER TABLE "mb_shop" RENAME CONSTRAINT "Shop_pkey" TO "mb_shop_pkey";
ALTER TABLE "mb_shop" ADD COLUMN     "cashClosingMode" "CashClosingMode" NOT NULL DEFAULT 'DAILY_ONLY',
ADD COLUMN     "stateCode" TEXT,
ALTER COLUMN "state" DROP NOT NULL;

-- AlterTable
ALTER TABLE "mb_shop_document_setting" RENAME CONSTRAINT "ShopDocumentSetting_pkey" TO "mb_shop_document_setting_pkey";

-- AlterTable
ALTER TABLE "mb_shop_product" RENAME CONSTRAINT "ShopProduct_pkey" TO "mb_shop_product_pkey";
ALTER TABLE "mb_shop_product" ADD COLUMN     "compatibilityGroupId" TEXT,
ADD COLUMN     "lastPurchasePrice" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "quantity" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalValue" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN     "warrantyDays" INTEGER;

-- AlterTable
ALTER TABLE "mb_shop_staff" RENAME CONSTRAINT "ShopStaff_pkey" TO "mb_shop_staff_pkey";
ALTER TABLE "mb_shop_staff" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "roleId" TEXT;

-- AlterTable
ALTER TABLE "mb_stock_correction" RENAME CONSTRAINT "StockCorrection_pkey" TO "mb_stock_correction_pkey";

-- AlterTable
ALTER TABLE "mb_stock_ledger" RENAME CONSTRAINT "StockLedger_pkey" TO "mb_stock_ledger_pkey";

-- AlterTable
ALTER TABLE "mb_supplier_payment" RENAME CONSTRAINT "SupplierPayment_pkey" TO "mb_supplier_payment_pkey";

-- AlterTable
ALTER TABLE "mb_trade_in" ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "payoutAt" SET DATA TYPE TIMESTAMP(3);

-- DropTable
DROP TABLE "WhatsAppPhoneNumberModule";

-- DropEnum
DROP TYPE "FollowUpPurpose";

-- CreateTable
CREATE TABLE "DeletionRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,
    "status" "DeletionStatus" NOT NULL DEFAULT 'PENDING',
    "adminNotes" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "originalEmail" TEXT,
    "originalLegalName" TEXT,
    "originalPhone" TEXT,
    "originalGstNumber" TEXT,
    "isHardDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "DeletionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mb_notification_log" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "eventId" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "recipient" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "payload" JSONB,
    "errorReason" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "title" TEXT,

    CONSTRAINT "mb_notification_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isComingSoon" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mb_contact" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "normalizedPhone" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mb_contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mb_loyalty_adjustment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "beforePoints" INTEGER NOT NULL,
    "afterPoints" INTEGER NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "adjustedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mb_loyalty_adjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mb_supplier_profile" (
    "id" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "category" TEXT,
    "riskFlag" BOOLEAN NOT NULL DEFAULT false,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "paymentDueDays" INTEGER NOT NULL DEFAULT 30,
    "creditLimit" INTEGER,
    "preferredCurrency" TEXT NOT NULL DEFAULT 'INR',

    CONSTRAINT "mb_supplier_profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mb_customer_note" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mb_customer_note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentRetry" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "status" "PaymentRetryStatus" NOT NULL DEFAULT 'PENDING',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "executedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentRetry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionInvoice" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "gstin" TEXT,
    "customerGstin" TEXT,
    "sacCode" TEXT NOT NULL DEFAULT '998314',
    "invoiceDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "amount" INTEGER NOT NULL,
    "cgst" INTEGER NOT NULL DEFAULT 0,
    "sgst" INTEGER NOT NULL DEFAULT 0,
    "igst" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "planSnapshot" JSONB NOT NULL,
    "status" "SubscriptionInvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "pdfUrl" TEXT,
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "emailSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mb_repair_fault_type" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mb_repair_fault_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mb_job_card_qc" (
    "id" TEXT NOT NULL,
    "jobCardId" TEXT NOT NULL,
    "cameraWorking" BOOLEAN NOT NULL DEFAULT false,
    "micWorking" BOOLEAN NOT NULL DEFAULT false,
    "speakerWorking" BOOLEAN NOT NULL DEFAULT false,
    "chargingWorking" BOOLEAN NOT NULL DEFAULT false,
    "wifiWorking" BOOLEAN NOT NULL DEFAULT false,
    "chargerReturned" BOOLEAN NOT NULL DEFAULT false,
    "simCardReturned" BOOLEAN NOT NULL DEFAULT false,
    "memoryCardReturned" BOOLEAN NOT NULL DEFAULT false,
    "otherAccessories" TEXT,
    "completedByUserId" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mb_job_card_qc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mb_fault_diagnosis" (
    "id" TEXT NOT NULL,
    "faultTypeId" TEXT NOT NULL,
    "tenantId" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mb_fault_diagnosis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mb_fault_diagnosis_step" (
    "id" TEXT NOT NULL,
    "guideId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "stepText" TEXT NOT NULL,

    CONSTRAINT "mb_fault_diagnosis_step_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mb_repair_knowledge" (
    "id" TEXT NOT NULL,
    "phoneModelId" TEXT,
    "faultTypeId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "videoUrl" TEXT,
    "tenantId" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "helpfulCount" INTEGER NOT NULL DEFAULT 0,
    "notHelpfulCount" INTEGER NOT NULL DEFAULT 0,
    "source" "RepairKnowledgeSource" NOT NULL DEFAULT 'ADMIN',
    "status" "RepairKnowledgeStatus" NOT NULL DEFAULT 'APPROVED',

    CONSTRAINT "mb_repair_knowledge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mb_expense_category" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mb_expense_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mb_grn" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "poId" TEXT NOT NULL,
    "grnNumber" TEXT NOT NULL,
    "receivedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "GRNStatus" NOT NULL DEFAULT 'DRAFT',
    "isVarianceOverridden" BOOLEAN NOT NULL DEFAULT false,
    "overrideNote" TEXT,
    "overriddenBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mb_grn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mb_grn_item" (
    "id" TEXT NOT NULL,
    "grnId" TEXT NOT NULL,
    "poItemId" TEXT NOT NULL,
    "shopProductId" TEXT NOT NULL,
    "receivedQuantity" INTEGER NOT NULL,
    "confirmedPrice" INTEGER,
    "uom" TEXT DEFAULT 'pcs',

    CONSTRAINT "mb_grn_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mb_compatibility_brand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "mb_compatibility_brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mb_compatibility_phone_model" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "displaySize" TEXT,
    "releaseYear" INTEGER,

    CONSTRAINT "mb_compatibility_phone_model_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mb_compatibility_part" (
    "id" TEXT NOT NULL,
    "partName" TEXT NOT NULL,
    "partType" "PartType" NOT NULL,

    CONSTRAINT "mb_compatibility_part_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mb_compatibility_group" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "partType" "PartType" NOT NULL,

    CONSTRAINT "mb_compatibility_group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mb_compatibility_group_phone" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "phoneModelId" TEXT NOT NULL,

    CONSTRAINT "mb_compatibility_group_phone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mb_part_compatibility" (
    "id" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,

    CONSTRAINT "mb_part_compatibility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mb_compatibility_feedback" (
    "id" TEXT NOT NULL,
    "type" "FeedbackType" NOT NULL,
    "phoneModelId" TEXT NOT NULL,
    "targetModelId" TEXT,
    "partType" "PartType" NOT NULL,
    "details" TEXT,
    "status" "FeedbackStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mb_compatibility_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureFlag" (
    "id" TEXT NOT NULL,
    "flag" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "scope" "FeatureFlagScope" NOT NULL,
    "tenantId" TEXT,
    "shopId" TEXT,
    "rolloutPercentage" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "recipientType" "EmailRecipientType" NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "staffId" TEXT,
    "customerId" TEXT,
    "emailType" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT,
    "module" "ModuleType" NOT NULL,
    "status" "EmailStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "error" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "RoleCategory" NOT NULL DEFAULT 'CUSTOM',
    "tenantId" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isRoot" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoleVersion" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoleVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resource" (
    "id" TEXT NOT NULL,
    "moduleType" "ModuleType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT,
    "approvalPolicy" JSONB,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "entityId" TEXT,
    "structuredData" JSONB NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "resolvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ownerComment" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "ApprovalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorsAllowedOrigin" (
    "id" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "label" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CorsAllowedOrigin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mb_distributor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gstNumber" TEXT,
    "contactPhone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mb_distributor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mb_distributor_tenant_link" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "distributorId" TEXT NOT NULL,
    "status" "LinkStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mb_distributor_tenant_link_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mb_wholesale_catalog" (
    "id" TEXT NOT NULL,
    "distributorId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "wholesalePrice" DOUBLE PRECISION NOT NULL,
    "moq" INTEGER NOT NULL DEFAULT 1,
    "stockAvailable" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mb_wholesale_catalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mb_b2_b_purchase_order" (
    "id" TEXT NOT NULL,
    "poNumber" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "distributorId" TEXT NOT NULL,
    "status" "B2BPOStatus" NOT NULL DEFAULT 'SUBMITTED',
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mb_b2_b_purchase_order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mb_b2_b_order_item" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "catalogItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "mb_b2_b_order_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Partner" (
    "id" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "contactPerson" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "partnerType" "PartnerType" NOT NULL,
    "region" TEXT,
    "status" "PartnerStatus" NOT NULL DEFAULT 'PENDING',
    "referralCode" TEXT NOT NULL,
    "totalEarned" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "passwordHash" TEXT NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "approvedByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "firstCommissionPct" DOUBLE PRECISION NOT NULL DEFAULT 30,
    "renewalCommissionPct" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "passwordResetExpiry" TIMESTAMP(3),
    "passwordResetToken" TEXT,
    "bankAccountName" TEXT,
    "bankAccountNumber" TEXT,
    "bankIfsc" TEXT,
    "bankName" TEXT,
    "lastPayoutAt" TIMESTAMP(3),
    "payoutRequestedAt" TIMESTAMP(3),
    "upiId" TEXT,

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromoCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "type" "PromoCodeType" NOT NULL,
    "durationDays" INTEGER NOT NULL DEFAULT 0,
    "discountPercentage" DOUBLE PRECISION,
    "maxUses" INTEGER NOT NULL DEFAULT 500,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "partnerId" TEXT,
    "createdByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bonusMonths" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PromoCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mb_partner_referral" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "subscriptionPlan" TEXT NOT NULL,
    "subscriptionAmount" DOUBLE PRECISION NOT NULL,
    "commissionPercentage" DOUBLE PRECISION NOT NULL,
    "commissionAmount" DOUBLE PRECISION NOT NULL,
    "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING',
    "confirmedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isFirstPayment" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "mb_partner_referral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mb_partner_notification" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "type" "PartnerNotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mb_partner_notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'PRODUCT_ADMIN',
    "productScope" "ModuleType",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_usage_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "module" "ModuleType" NOT NULL,
    "feature" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "promptTokens" INTEGER NOT NULL,
    "completionTokens" INTEGER NOT NULL,
    "totalTokens" INTEGER NOT NULL,
    "costUsd" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promo_usages" (
    "id" TEXT NOT NULL,
    "promoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promo_usages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingEventLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "providerReferenceId" TEXT,
    "statusBefore" TEXT,
    "statusAfter" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingEventLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CountryConfig" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "phonePrefix" TEXT NOT NULL,
    "taxSystem" TEXT NOT NULL DEFAULT 'GST',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CountryConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mb_waitlist_lead" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "source" "WaitlistSource" NOT NULL DEFAULT 'FEATURES_PAGE',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mb_waitlist_lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mb_credit_note" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "creditNoteNo" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "financialYear" TEXT,
    "customerId" TEXT,
    "supplierId" TEXT,
    "linkedInvoiceId" TEXT,
    "linkedPurchaseId" TEXT,
    "type" "CreditNoteType" NOT NULL,
    "reason" "CreditNoteReason" NOT NULL,
    "status" "CreditNoteStatus" NOT NULL DEFAULT 'DRAFT',
    "subTotal" INTEGER NOT NULL,
    "gstAmount" INTEGER NOT NULL,
    "totalAmount" INTEGER NOT NULL,
    "appliedAmount" INTEGER NOT NULL DEFAULT 0,
    "refundedAmount" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "voidReason" TEXT,
    "voidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "mb_credit_note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mb_credit_note_item" (
    "id" TEXT NOT NULL,
    "creditNoteId" TEXT NOT NULL,
    "shopProductId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "rate" INTEGER NOT NULL,
    "hsnCode" TEXT,
    "gstRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gstAmount" INTEGER NOT NULL DEFAULT 0,
    "lineTotal" INTEGER NOT NULL,
    "restockItem" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "mb_credit_note_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mb_credit_note_application" (
    "id" TEXT NOT NULL,
    "creditNoteId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "purchaseId" TEXT,
    "amount" INTEGER NOT NULL,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "appliedBy" TEXT NOT NULL,

    CONSTRAINT "mb_credit_note_application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mb_daily_closing" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "salesCash" INTEGER NOT NULL DEFAULT 0,
    "salesUpi" INTEGER NOT NULL DEFAULT 0,
    "salesCard" INTEGER NOT NULL DEFAULT 0,
    "salesBank" INTEGER NOT NULL DEFAULT 0,
    "cashDifference" INTEGER NOT NULL DEFAULT 0,
    "status" "DailyClosingStatus" NOT NULL DEFAULT 'DRAFT',
    "closedBy" TEXT,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "cashDepositToBank" INTEGER NOT NULL DEFAULT 0,
    "cashWithdrawFromBank" INTEGER NOT NULL DEFAULT 0,
    "expectedClosingCash" INTEGER NOT NULL DEFAULT 0,
    "expenseCash" INTEGER NOT NULL DEFAULT 0,
    "openingCash" INTEGER NOT NULL DEFAULT 0,
    "otherCashIn" INTEGER NOT NULL DEFAULT 0,
    "otherCashOut" INTEGER NOT NULL DEFAULT 0,
    "reportedClosingCash" INTEGER NOT NULL DEFAULT 0,
    "supplierPaymentsCash" INTEGER NOT NULL DEFAULT 0,
    "varianceNote" TEXT,
    "varianceReason" TEXT,
    "mode" "DailyClosingMode" NOT NULL DEFAULT 'SYSTEM',
    "denominations" JSONB,

    CONSTRAINT "mb_daily_closing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mb_shift_closing" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "shiftName" TEXT NOT NULL,
    "openingCash" INTEGER NOT NULL DEFAULT 0,
    "salesCash" INTEGER NOT NULL DEFAULT 0,
    "cashExpenses" INTEGER NOT NULL DEFAULT 0,
    "cashOutflows" INTEGER NOT NULL DEFAULT 0,
    "expectedClosingCash" INTEGER NOT NULL DEFAULT 0,
    "reportedClosingCash" INTEGER NOT NULL DEFAULT 0,
    "cashDifference" INTEGER NOT NULL DEFAULT 0,
    "openedBy" TEXT NOT NULL,
    "closedBy" TEXT,
    "closedAt" TIMESTAMP(3),
    "status" "ShiftClosingStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mb_shift_closing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mb_cash_variance" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "dailyClosingId" TEXT NOT NULL,
    "expectedCash" INTEGER NOT NULL,
    "physicalCash" INTEGER NOT NULL,
    "difference" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "reportedBy" TEXT NOT NULL,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "status" "CashVarianceStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mb_cash_variance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mb_stock_verification" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "sessionDate" DATE NOT NULL,
    "status" "StockVerificationStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "confirmedBy" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "cancelledBy" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mb_stock_verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mb_stock_verification_item" (
    "id" TEXT NOT NULL,
    "verificationId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "shopProductId" TEXT NOT NULL,
    "systemQty" INTEGER NOT NULL,
    "physicalQty" INTEGER NOT NULL,
    "difference" INTEGER NOT NULL,
    "reason" "AdjustmentReason",
    "stockLedgerId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mb_stock_verification_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mb_daily_metrics" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "totalSales" INTEGER NOT NULL DEFAULT 0,
    "totalInvoices" INTEGER NOT NULL DEFAULT 0,
    "cashSales" INTEGER NOT NULL DEFAULT 0,
    "upiSales" INTEGER NOT NULL DEFAULT 0,
    "cardSales" INTEGER NOT NULL DEFAULT 0,
    "creditSales" INTEGER NOT NULL DEFAULT 0,
    "totalPurchases" INTEGER NOT NULL DEFAULT 0,
    "totalExpenses" INTEGER NOT NULL DEFAULT 0,
    "totalJobCards" INTEGER NOT NULL DEFAULT 0,
    "completedJobCards" INTEGER NOT NULL DEFAULT 0,
    "grossProfit" INTEGER NOT NULL DEFAULT 0,
    "inventoryLoss" INTEGER NOT NULL DEFAULT 0,
    "footfall" INTEGER NOT NULL DEFAULT 0,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mb_daily_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mb_system_ai_config" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'OLLAMA',
    "baseUrl" TEXT,
    "apiKey" TEXT,
    "defaultModel" TEXT NOT NULL DEFAULT 'llama3:8b',
    "embeddingModel" TEXT DEFAULT 'nomic-embed-text',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mb_system_ai_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_daily_revenue_stats" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "product" TEXT NOT NULL,
    "newMrr" INTEGER NOT NULL DEFAULT 0,
    "expansionMrr" INTEGER NOT NULL DEFAULT 0,
    "contractedMrr" INTEGER NOT NULL DEFAULT 0,
    "churnedMrr" INTEGER NOT NULL DEFAULT 0,
    "netMrr" INTEGER NOT NULL DEFAULT 0,
    "totalMrr" INTEGER NOT NULL DEFAULT 0,
    "newTenants" INTEGER NOT NULL DEFAULT 0,
    "churnedTenants" INTEGER NOT NULL DEFAULT 0,
    "activeTenants" INTEGER NOT NULL DEFAULT 0,
    "successfulPayments" INTEGER NOT NULL DEFAULT 0,
    "failedPayments" INTEGER NOT NULL DEFAULT 0,
    "paymentVolume" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "admin_daily_revenue_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_tenant_health_scores" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "loginScore" INTEGER NOT NULL DEFAULT 0,
    "featureScore" INTEGER NOT NULL DEFAULT 0,
    "revenueScore" INTEGER NOT NULL DEFAULT 0,
    "activityScore" INTEGER NOT NULL DEFAULT 0,
    "churnRisk" "ChurnRisk" NOT NULL DEFAULT 'MEDIUM',
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_tenant_health_scores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mb_notification_log_tenantId_idx" ON "mb_notification_log"("tenantId");

-- CreateIndex
CREATE INDEX "mb_notification_log_userId_idx" ON "mb_notification_log"("userId");

-- CreateIndex
CREATE INDEX "mb_notification_log_status_idx" ON "mb_notification_log"("status");

-- CreateIndex
CREATE INDEX "mb_notification_log_eventId_idx" ON "mb_notification_log"("eventId");

-- CreateIndex
CREATE INDEX "mb_notification_log_createdAt_idx" ON "mb_notification_log"("createdAt");

-- CreateIndex
CREATE INDEX "mb_notification_log_tenantId_channel_readAt_idx" ON "mb_notification_log"("tenantId", "channel", "readAt");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessCategory_name_key" ON "BusinessCategory"("name");

-- CreateIndex
CREATE INDEX "BusinessCategory_isActive_sortOrder_idx" ON "BusinessCategory"("isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_token_key" ON "RefreshToken"("token");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "mb_contact_tenantId_idx" ON "mb_contact"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "mb_contact_tenantId_normalizedPhone_key" ON "mb_contact"("tenantId", "normalizedPhone");

-- CreateIndex
CREATE INDEX "mb_loyalty_adjustment_tenantId_idx" ON "mb_loyalty_adjustment"("tenantId");

-- CreateIndex
CREATE INDEX "mb_loyalty_adjustment_partyId_idx" ON "mb_loyalty_adjustment"("partyId");

-- CreateIndex
CREATE INDEX "mb_loyalty_adjustment_createdAt_idx" ON "mb_loyalty_adjustment"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "mb_supplier_profile_partyId_key" ON "mb_supplier_profile"("partyId");

-- CreateIndex
CREATE INDEX "mb_customer_note_tenantId_customerId_idx" ON "mb_customer_note"("tenantId", "customerId");

-- CreateIndex
CREATE INDEX "mb_customer_note_tenantId_idx" ON "mb_customer_note"("tenantId");

-- CreateIndex
CREATE INDEX "PaymentRetry_paymentId_idx" ON "PaymentRetry"("paymentId");

-- CreateIndex
CREATE INDEX "PaymentRetry_status_idx" ON "PaymentRetry"("status");

-- CreateIndex
CREATE INDEX "PaymentRetry_scheduledAt_idx" ON "PaymentRetry"("scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionInvoice_invoiceNumber_key" ON "SubscriptionInvoice"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionInvoice_paymentId_key" ON "SubscriptionInvoice"("paymentId");

-- CreateIndex
CREATE INDEX "SubscriptionInvoice_tenantId_idx" ON "SubscriptionInvoice"("tenantId");

-- CreateIndex
CREATE INDEX "SubscriptionInvoice_invoiceNumber_idx" ON "SubscriptionInvoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "SubscriptionInvoice_invoiceDate_idx" ON "SubscriptionInvoice"("invoiceDate");

-- CreateIndex
CREATE INDEX "SubscriptionInvoice_status_idx" ON "SubscriptionInvoice"("status");

-- CreateIndex
CREATE UNIQUE INDEX "mb_repair_fault_type_name_key" ON "mb_repair_fault_type"("name");

-- CreateIndex
CREATE UNIQUE INDEX "mb_job_card_qc_jobCardId_key" ON "mb_job_card_qc"("jobCardId");

-- CreateIndex
CREATE UNIQUE INDEX "mb_fault_diagnosis_tenantId_faultTypeId_key" ON "mb_fault_diagnosis"("tenantId", "faultTypeId");

-- CreateIndex
CREATE INDEX "mb_fault_diagnosis_step_guideId_idx" ON "mb_fault_diagnosis_step"("guideId");

-- CreateIndex
CREATE INDEX "mb_repair_knowledge_phoneModelId_faultTypeId_idx" ON "mb_repair_knowledge"("phoneModelId", "faultTypeId");

-- CreateIndex
CREATE INDEX "mb_repair_knowledge_tenantId_idx" ON "mb_repair_knowledge"("tenantId");

-- CreateIndex
CREATE INDEX "mb_repair_knowledge_status_idx" ON "mb_repair_knowledge"("status");

-- CreateIndex
CREATE INDEX "mb_expense_category_tenantId_idx" ON "mb_expense_category"("tenantId");

-- CreateIndex
CREATE INDEX "mb_expense_category_shopId_idx" ON "mb_expense_category"("shopId");

-- CreateIndex
CREATE INDEX "mb_grn_tenantId_idx" ON "mb_grn"("tenantId");

-- CreateIndex
CREATE INDEX "mb_grn_shopId_idx" ON "mb_grn"("shopId");

-- CreateIndex
CREATE INDEX "mb_grn_poId_idx" ON "mb_grn"("poId");

-- CreateIndex
CREATE UNIQUE INDEX "mb_grn_shopId_grnNumber_key" ON "mb_grn"("shopId", "grnNumber");

-- CreateIndex
CREATE INDEX "mb_grn_item_grnId_idx" ON "mb_grn_item"("grnId");

-- CreateIndex
CREATE INDEX "mb_grn_item_poItemId_idx" ON "mb_grn_item"("poItemId");

-- CreateIndex
CREATE UNIQUE INDEX "mb_compatibility_brand_name_key" ON "mb_compatibility_brand"("name");

-- CreateIndex
CREATE INDEX "mb_compatibility_phone_model_modelName_idx" ON "mb_compatibility_phone_model"("modelName");

-- CreateIndex
CREATE UNIQUE INDEX "mb_compatibility_phone_model_brandId_modelName_key" ON "mb_compatibility_phone_model"("brandId", "modelName");

-- CreateIndex
CREATE INDEX "mb_compatibility_part_partType_idx" ON "mb_compatibility_part"("partType");

-- CreateIndex
CREATE UNIQUE INDEX "mb_compatibility_group_name_key" ON "mb_compatibility_group"("name");

-- CreateIndex
CREATE INDEX "mb_compatibility_group_partType_idx" ON "mb_compatibility_group"("partType");

-- CreateIndex
CREATE INDEX "mb_compatibility_group_phone_phoneModelId_idx" ON "mb_compatibility_group_phone"("phoneModelId");

-- CreateIndex
CREATE INDEX "mb_compatibility_group_phone_groupId_idx" ON "mb_compatibility_group_phone"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "mb_compatibility_group_phone_groupId_phoneModelId_key" ON "mb_compatibility_group_phone"("groupId", "phoneModelId");

-- CreateIndex
CREATE INDEX "mb_part_compatibility_groupId_idx" ON "mb_part_compatibility"("groupId");

-- CreateIndex
CREATE INDEX "mb_part_compatibility_partId_idx" ON "mb_part_compatibility"("partId");

-- CreateIndex
CREATE UNIQUE INDEX "mb_part_compatibility_partId_groupId_key" ON "mb_part_compatibility"("partId", "groupId");

-- CreateIndex
CREATE INDEX "FeatureFlag_tenantId_idx" ON "FeatureFlag"("tenantId");

-- CreateIndex
CREATE INDEX "FeatureFlag_shopId_idx" ON "FeatureFlag"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureFlag_flag_scope_tenantId_shopId_key" ON "FeatureFlag"("flag", "scope", "tenantId", "shopId");

-- CreateIndex
CREATE INDEX "EmailLog_tenantId_idx" ON "EmailLog"("tenantId");

-- CreateIndex
CREATE INDEX "EmailLog_status_idx" ON "EmailLog"("status");

-- CreateIndex
CREATE INDEX "EmailLog_createdAt_idx" ON "EmailLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmailLog_tenantId_recipientType_emailType_referenceId_modul_key" ON "EmailLog"("tenantId", "recipientType", "emailType", "referenceId", "module");

-- CreateIndex
CREATE UNIQUE INDEX "Role_tenantId_name_key" ON "Role"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Resource_moduleType_name_key" ON "Resource"("moduleType", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_resourceId_action_key" ON "Permission"("resourceId", "action");

-- CreateIndex
CREATE INDEX "RolePermission_roleId_idx" ON "RolePermission"("roleId");

-- CreateIndex
CREATE INDEX "RolePermission_permissionId_idx" ON "RolePermission"("permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_roleId_permissionId_key" ON "RolePermission"("roleId", "permissionId");

-- CreateIndex
CREATE INDEX "ApprovalRequest_tenantId_shopId_idx" ON "ApprovalRequest"("tenantId", "shopId");

-- CreateIndex
CREATE INDEX "ApprovalRequest_status_idx" ON "ApprovalRequest"("status");

-- CreateIndex
CREATE INDEX "ApprovalRequest_tenantId_deletedAt_idx" ON "ApprovalRequest"("tenantId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CorsAllowedOrigin_origin_key" ON "CorsAllowedOrigin"("origin");

-- CreateIndex
CREATE INDEX "CorsAllowedOrigin_isEnabled_idx" ON "CorsAllowedOrigin"("isEnabled");

-- CreateIndex
CREATE UNIQUE INDEX "mb_distributor_tenant_link_tenantId_distributorId_key" ON "mb_distributor_tenant_link"("tenantId", "distributorId");

-- CreateIndex
CREATE UNIQUE INDEX "mb_b2_b_purchase_order_poNumber_key" ON "mb_b2_b_purchase_order"("poNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Partner_email_key" ON "Partner"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Partner_referralCode_key" ON "Partner"("referralCode");

-- CreateIndex
CREATE UNIQUE INDEX "Partner_passwordResetToken_key" ON "Partner"("passwordResetToken");

-- CreateIndex
CREATE UNIQUE INDEX "PromoCode_code_key" ON "PromoCode"("code");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_userId_key" ON "AdminUser"("userId");

-- CreateIndex
CREATE INDEX "AdminUser_role_idx" ON "AdminUser"("role");

-- CreateIndex
CREATE INDEX "ai_usage_logs_tenantId_createdAt_idx" ON "ai_usage_logs"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "ai_usage_logs_module_createdAt_idx" ON "ai_usage_logs"("module", "createdAt");

-- CreateIndex
CREATE INDEX "promo_usages_promoId_idx" ON "promo_usages"("promoId");

-- CreateIndex
CREATE INDEX "promo_usages_userId_idx" ON "promo_usages"("userId");

-- CreateIndex
CREATE INDEX "promo_usages_tenantId_idx" ON "promo_usages"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "promo_usages_promoId_tenantId_key" ON "promo_usages"("promoId", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "CountryConfig_code_key" ON "CountryConfig"("code");

-- CreateIndex
CREATE INDEX "CountryConfig_isActive_idx" ON "CountryConfig"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "mb_waitlist_lead_phone_key" ON "mb_waitlist_lead"("phone");

-- CreateIndex
CREATE INDEX "mb_waitlist_lead_phone_idx" ON "mb_waitlist_lead"("phone");

-- CreateIndex
CREATE INDEX "mb_waitlist_lead_status_idx" ON "mb_waitlist_lead"("status");

-- CreateIndex
CREATE INDEX "mb_waitlist_lead_createdAt_idx" ON "mb_waitlist_lead"("createdAt");

-- CreateIndex
CREATE INDEX "mb_credit_note_tenantId_idx" ON "mb_credit_note"("tenantId");

-- CreateIndex
CREATE INDEX "mb_credit_note_shopId_idx" ON "mb_credit_note"("shopId");

-- CreateIndex
CREATE INDEX "mb_credit_note_customerId_idx" ON "mb_credit_note"("customerId");

-- CreateIndex
CREATE INDEX "mb_credit_note_supplierId_idx" ON "mb_credit_note"("supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "mb_credit_note_shopId_creditNoteNo_key" ON "mb_credit_note"("shopId", "creditNoteNo");

-- CreateIndex
CREATE INDEX "mb_credit_note_item_creditNoteId_idx" ON "mb_credit_note_item"("creditNoteId");

-- CreateIndex
CREATE INDEX "mb_credit_note_application_creditNoteId_idx" ON "mb_credit_note_application"("creditNoteId");

-- CreateIndex
CREATE INDEX "mb_daily_closing_tenantId_shopId_date_idx" ON "mb_daily_closing"("tenantId", "shopId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "mb_daily_closing_tenantId_shopId_date_key" ON "mb_daily_closing"("tenantId", "shopId", "date");

-- CreateIndex
CREATE INDEX "mb_shift_closing_tenantId_shopId_date_idx" ON "mb_shift_closing"("tenantId", "shopId", "date");

-- CreateIndex
CREATE INDEX "mb_cash_variance_tenantId_shopId_idx" ON "mb_cash_variance"("tenantId", "shopId");

-- CreateIndex
CREATE INDEX "mb_cash_variance_dailyClosingId_idx" ON "mb_cash_variance"("dailyClosingId");

-- CreateIndex
CREATE INDEX "mb_stock_verification_tenantId_shopId_sessionDate_idx" ON "mb_stock_verification"("tenantId", "shopId", "sessionDate");

-- CreateIndex
CREATE INDEX "mb_stock_verification_tenantId_status_idx" ON "mb_stock_verification"("tenantId", "status");

-- CreateIndex
CREATE INDEX "mb_stock_verification_item_tenantId_shopId_idx" ON "mb_stock_verification_item"("tenantId", "shopId");

-- CreateIndex
CREATE INDEX "mb_stock_verification_item_shopProductId_idx" ON "mb_stock_verification_item"("shopProductId");

-- CreateIndex
CREATE UNIQUE INDEX "mb_stock_verification_item_verificationId_shopProductId_key" ON "mb_stock_verification_item"("verificationId", "shopProductId");

-- CreateIndex
CREATE INDEX "mb_daily_metrics_tenantId_shopId_date_idx" ON "mb_daily_metrics"("tenantId", "shopId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "mb_daily_metrics_tenantId_shopId_date_key" ON "mb_daily_metrics"("tenantId", "shopId", "date");

-- CreateIndex
CREATE INDEX "admin_daily_revenue_stats_date_idx" ON "admin_daily_revenue_stats"("date");

-- CreateIndex
CREATE INDEX "admin_daily_revenue_stats_product_date_idx" ON "admin_daily_revenue_stats"("product", "date");

-- CreateIndex
CREATE UNIQUE INDEX "admin_daily_revenue_stats_date_product_key" ON "admin_daily_revenue_stats"("date", "product");

-- CreateIndex
CREATE UNIQUE INDEX "admin_tenant_health_scores_tenantId_key" ON "admin_tenant_health_scores"("tenantId");

-- CreateIndex
CREATE INDEX "admin_tenant_health_scores_churnRisk_idx" ON "admin_tenant_health_scores"("churnRisk");

-- CreateIndex
CREATE INDEX "admin_tenant_health_scores_score_idx" ON "admin_tenant_health_scores"("score");

-- CreateIndex
CREATE INDEX "admin_tenant_health_scores_computedAt_idx" ON "admin_tenant_health_scores"("computedAt");

-- CreateIndex
CREATE INDEX "Payment_module_createdAt_idx" ON "Payment"("module", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "PlanPrice_planId_billingCycle_currency_key" ON "PlanPrice"("planId", "billingCycle", "currency");

-- CreateIndex
CREATE INDEX "PlatformAuditLog_createdAt_idx" ON "PlatformAuditLog"("createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "StaffInvite_inviteToken_key" ON "StaffInvite"("inviteToken");

-- CreateIndex
CREATE INDEX "StaffInvite_email_status_deletedAt_idx" ON "StaffInvite"("email", "status", "deletedAt");

-- CreateIndex
CREATE INDEX "StaffInvite_status_idx" ON "StaffInvite"("status");

-- CreateIndex
CREATE INDEX "StaffInvite_tenantId_deletedAt_idx" ON "StaffInvite"("tenantId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "StaffInvite_tenantId_email_status_key" ON "StaffInvite"("tenantId", "email", "status");

-- CreateIndex
CREATE INDEX "idx_subscription_lookup" ON "TenantSubscription"("tenantId", "module", "status");

-- CreateIndex
CREATE INDEX "idx_subscription_lookup_sorted" ON "TenantSubscription"("tenantId", "module", "status", "startDate" DESC);

-- CreateIndex
CREATE INDEX "TenantSubscription_providerSubscriptionId_idx" ON "TenantSubscription"("providerSubscriptionId");

-- CreateIndex
CREATE INDEX "TenantSubscription_providerPaymentLinkId_idx" ON "TenantSubscription"("providerPaymentLinkId");

-- CreateIndex
CREATE INDEX "TenantSubscription_status_module_idx" ON "TenantSubscription"("status", "module");

-- CreateIndex
CREATE INDEX "TenantSubscription_tenantId_status_endDate_idx" ON "TenantSubscription"("tenantId", "status", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "TenantSubscription_tenantId_module_endDate_key" ON "TenantSubscription"("tenantId", "module", "endDate");

-- CreateIndex
CREATE INDEX "User_REMOVED_AUTH_PROVIDERUid_deletedAt_idx" ON "User"("REMOVED_AUTH_PROVIDERUid", "deletedAt");

-- CreateIndex
CREATE INDEX "User_tenantId_deletedAt_idx" ON "User"("tenantId", "deletedAt");

-- CreateIndex
CREATE INDEX "WebhookEvent_provider_eventType_idx" ON "WebhookEvent"("provider", "eventType");

-- CreateIndex
CREATE INDEX "WebhookEvent_status_idx" ON "WebhookEvent"("status");

-- CreateIndex
CREATE INDEX "WebhookEvent_receivedAt_idx" ON "WebhookEvent"("receivedAt");

-- CreateIndex
CREATE INDEX "WebhookEvent_referenceId_idx" ON "WebhookEvent"("referenceId");

-- CreateIndex
CREATE INDEX "WhatsAppAutomation_eventType_idx" ON "WhatsAppAutomation"("eventType");

-- CreateIndex
CREATE INDEX "WhatsAppAutomation_enabled_idx" ON "WhatsAppAutomation"("enabled");

-- CreateIndex
CREATE INDEX "WhatsAppAutomation_moduleType_eventType_enabled_idx" ON "WhatsAppAutomation"("moduleType", "eventType", "enabled");

-- CreateIndex
CREATE INDEX "WhatsAppLog_whatsAppNumberId_idx" ON "WhatsAppLog"("whatsAppNumberId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppPhoneNumber_phoneNumberId_key" ON "WhatsAppPhoneNumber"("phoneNumberId");

-- CreateIndex
CREATE INDEX "WhatsAppPhoneNumber_phoneNumberId_idx" ON "WhatsAppPhoneNumber"("phoneNumberId");

-- CreateIndex
CREATE INDEX "gp_member_tenantId_deletedAt_idx" ON "gp_member"("tenantId", "deletedAt");

-- CreateIndex
CREATE INDEX "gp_member_fullName_idx" ON "gp_member"("fullName");

-- CreateIndex
CREATE INDEX "lg_ledger_customer_customerId_idx" ON "lg_ledger_customer"("customerId");

-- CreateIndex
CREATE INDEX "mb_audit_log_tenantId_createdAt_idx" ON "mb_audit_log"("tenantId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "mb_audit_log_entity_entityId_idx" ON "mb_audit_log"("entity", "entityId");

-- CreateIndex
CREATE INDEX "mb_customer_follow_up_tenantId_customerId_idx" ON "mb_customer_follow_up"("tenantId", "customerId");

-- CreateIndex
CREATE INDEX "mb_customer_follow_up_sourceJobId_idx" ON "mb_customer_follow_up"("sourceJobId");

-- CreateIndex
CREATE INDEX "mb_customer_follow_up_tenantId_assignedToUserId_status_foll_idx" ON "mb_customer_follow_up"("tenantId", "assignedToUserId", "status", "followUpAt");

-- CreateIndex
CREATE INDEX "mb_customer_reminder_status_channel_scheduledAt_idx" ON "mb_customer_reminder"("status", "channel", "scheduledAt");

-- CreateIndex
CREATE INDEX "mb_customer_reminder_tenantId_status_scheduledAt_idx" ON "mb_customer_reminder"("tenantId", "status", "scheduledAt");

-- CreateIndex
CREATE INDEX "mb_invoice_tenantId_invoiceDate_idx" ON "mb_invoice"("tenantId", "invoiceDate");

-- CreateIndex
CREATE INDEX "mb_invoice_shopId_invoiceDate_idx" ON "mb_invoice"("shopId", "invoiceDate");

-- CreateIndex
CREATE INDEX "mb_invoice_tenantId_deletedAt_idx" ON "mb_invoice"("tenantId", "deletedAt");

-- CreateIndex
CREATE INDEX "mb_invoice_tenantId_shopId_deletedAt_createdAt_totalAmount_idx" ON "mb_invoice"("tenantId", "shopId", "deletedAt", "createdAt", "totalAmount");

-- CreateIndex
CREATE INDEX "mb_invoice_tenantId_shopId_deletedAt_status_createdAt_total_idx" ON "mb_invoice"("tenantId", "shopId", "deletedAt", "status", "createdAt", "totalAmount");

-- CreateIndex
CREATE INDEX "mb_invoice_tenantId_deletedAt_status_invoiceDate_idx" ON "mb_invoice"("tenantId", "deletedAt", "status", "invoiceDate");

-- CreateIndex
CREATE INDEX "mb_invoice_tenantId_deletedAt_invoiceDate_idx" ON "mb_invoice"("tenantId", "deletedAt", "invoiceDate");

-- CreateIndex
CREATE INDEX "mb_invoice_tenantId_shopId_status_invoiceDate_idx" ON "mb_invoice"("tenantId", "shopId", "status", "invoiceDate");

-- CreateIndex
CREATE UNIQUE INDEX "mb_invoice_tenantId_invoiceNumber_key" ON "mb_invoice"("tenantId", "invoiceNumber");

-- CreateIndex
CREATE INDEX "mb_job_card_shopId_createdAt_idx" ON "mb_job_card"("shopId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "mb_job_card_tenantId_deletedAt_idx" ON "mb_job_card"("tenantId", "deletedAt");

-- CreateIndex
CREATE INDEX "mb_job_card_tenantId_shopId_deletedAt_createdAt_idx" ON "mb_job_card"("tenantId", "shopId", "deletedAt", "createdAt");

-- CreateIndex
CREATE INDEX "mb_job_card_tenantId_shopId_deletedAt_status_idx" ON "mb_job_card"("tenantId", "shopId", "deletedAt", "status");

-- CreateIndex
CREATE INDEX "mb_job_card_tenantId_shopId_status_updatedAt_idx" ON "mb_job_card"("tenantId", "shopId", "status", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "mb_loyalty_config_shopId_key" ON "mb_loyalty_config"("shopId");

-- CreateIndex
CREATE INDEX "mb_loyalty_config_shopId_idx" ON "mb_loyalty_config"("shopId");

-- CreateIndex
CREATE INDEX "mb_loyalty_transaction_shopId_idx" ON "mb_loyalty_transaction"("shopId");

-- CreateIndex
CREATE INDEX "mb_loyalty_transaction_referenceId_idx" ON "mb_loyalty_transaction"("referenceId");

-- CreateIndex
CREATE INDEX "mb_party_tenantId_deletedAt_idx" ON "mb_party"("tenantId", "deletedAt");

-- CreateIndex
CREATE INDEX "mb_party_name_idx" ON "mb_party"("name");

-- CreateIndex
CREATE UNIQUE INDEX "mb_party_tenantId_normalizedPhone_key" ON "mb_party"("tenantId", "normalizedPhone");

-- CreateIndex
CREATE INDEX "mb_purchase_tenantId_status_invoiceDate_idx" ON "mb_purchase"("tenantId", "status", "invoiceDate");

-- CreateIndex
CREATE INDEX "mb_purchase_tenantId_invoiceDate_idx" ON "mb_purchase"("tenantId", "invoiceDate");

-- CreateIndex
CREATE UNIQUE INDEX "mb_purchase_tenantId_invoiceNumber_key" ON "mb_purchase"("tenantId", "invoiceNumber");

-- CreateIndex
CREATE INDEX "mb_receipt_tenantId_shopId_createdAt_idx" ON "mb_receipt"("tenantId", "shopId", "createdAt");

-- CreateIndex
CREATE INDEX "mb_receipt_tenantId_shopId_status_createdAt_amount_idx" ON "mb_receipt"("tenantId", "shopId", "status", "createdAt", "amount");

-- CreateIndex
CREATE INDEX "mb_shop_tenantId_deletedAt_idx" ON "mb_shop"("tenantId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "mb_shop_product_tenantId_shopId_sku_key" ON "mb_shop_product"("tenantId", "shopId", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "mb_shop_staff_userId_tenantId_shopId_key" ON "mb_shop_staff"("userId", "tenantId", "shopId");

-- CreateIndex
CREATE INDEX "mb_stock_ledger_tenantId_shopId_type_createdAt_idx" ON "mb_stock_ledger"("tenantId", "shopId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "mb_stock_ledger_tenantId_shopId_shopProductId_type_quantity_idx" ON "mb_stock_ledger"("tenantId", "shopId", "shopProductId", "type", "quantity");

-- RenameForeignKey
ALTER TABLE "gp_gym_attendance" RENAME CONSTRAINT "GymAttendance_memberId_fkey" TO "gp_gym_attendance_memberId_fkey";

-- RenameForeignKey
ALTER TABLE "gp_gym_membership" RENAME CONSTRAINT "GymMembership_memberId_fkey" TO "gp_gym_membership_memberId_fkey";

-- RenameForeignKey
ALTER TABLE "gp_member" RENAME CONSTRAINT "Member_customerId_fkey" TO "gp_member_customerId_fkey";

-- RenameForeignKey
ALTER TABLE "gp_member" RENAME CONSTRAINT "Member_tenantId_fkey" TO "gp_member_tenantId_fkey";

-- RenameForeignKey
ALTER TABLE "gp_member_payment" RENAME CONSTRAINT "MemberPayment_memberId_fkey" TO "gp_member_payment_memberId_fkey";

-- RenameForeignKey
ALTER TABLE "lg_ledger_account" RENAME CONSTRAINT "LedgerAccount_customerId_fkey" TO "lg_ledger_account_customerId_fkey";

-- RenameForeignKey
ALTER TABLE "lg_ledger_account" RENAME CONSTRAINT "LedgerAccount_tenantId_fkey" TO "lg_ledger_account_tenantId_fkey";

-- RenameForeignKey
ALTER TABLE "lg_ledger_collection" RENAME CONSTRAINT "LedgerCollection_ledgerId_fkey" TO "lg_ledger_collection_ledgerId_fkey";

-- RenameForeignKey
ALTER TABLE "lg_ledger_customer" RENAME CONSTRAINT "LedgerCustomer_tenantId_fkey" TO "lg_ledger_customer_tenantId_fkey";

-- RenameForeignKey
ALTER TABLE "lg_ledger_payment" RENAME CONSTRAINT "LedgerPayment_collectedBy_fkey" TO "lg_ledger_payment_collectedBy_fkey";

-- RenameForeignKey
ALTER TABLE "lg_ledger_payment" RENAME CONSTRAINT "LedgerPayment_collectionId_fkey" TO "lg_ledger_payment_collectionId_fkey";

-- RenameForeignKey
ALTER TABLE "lg_ledger_payment" RENAME CONSTRAINT "LedgerPayment_customerId_fkey" TO "lg_ledger_payment_customerId_fkey";

-- RenameForeignKey
ALTER TABLE "lg_ledger_payment" RENAME CONSTRAINT "LedgerPayment_ledgerId_fkey" TO "lg_ledger_payment_ledgerId_fkey";

-- RenameForeignKey
ALTER TABLE "lg_ledger_payment" RENAME CONSTRAINT "LedgerPayment_tenantId_fkey" TO "lg_ledger_payment_tenantId_fkey";

-- RenameForeignKey
ALTER TABLE "mb_advance_application" RENAME CONSTRAINT "AdvanceApplication_advanceVoucherId_fkey" TO "mb_advance_application_advanceVoucherId_fkey";

-- RenameForeignKey
ALTER TABLE "mb_advance_application" RENAME CONSTRAINT "AdvanceApplication_purchaseId_fkey" TO "mb_advance_application_purchaseId_fkey";

-- RenameForeignKey
ALTER TABLE "mb_audit_log" RENAME CONSTRAINT "AuditLog_tenantId_fkey" TO "mb_audit_log_tenantId_fkey";

-- RenameForeignKey
ALTER TABLE "mb_audit_log" RENAME CONSTRAINT "AuditLog_userId_fkey" TO "mb_audit_log_userId_fkey";

-- RenameForeignKey
ALTER TABLE "mb_customer_alert" RENAME CONSTRAINT "CustomerAlert_customerId_fkey" TO "mb_customer_alert_customerId_fkey";

-- RenameForeignKey
ALTER TABLE "mb_customer_alert" RENAME CONSTRAINT "CustomerAlert_tenantId_fkey" TO "mb_customer_alert_tenantId_fkey";

-- RenameForeignKey
ALTER TABLE "mb_customer_follow_up" RENAME CONSTRAINT "CustomerFollowUp_assignedToUserId_fkey" TO "mb_customer_follow_up_assignedToUserId_fkey";

-- RenameForeignKey
ALTER TABLE "mb_customer_follow_up" RENAME CONSTRAINT "CustomerFollowUp_customerId_fkey" TO "mb_customer_follow_up_customerId_fkey";

-- RenameForeignKey
ALTER TABLE "mb_customer_follow_up" RENAME CONSTRAINT "CustomerFollowUp_shopId_fkey" TO "mb_customer_follow_up_shopId_fkey";

-- RenameForeignKey
ALTER TABLE "mb_customer_follow_up" RENAME CONSTRAINT "CustomerFollowUp_tenantId_fkey" TO "mb_customer_follow_up_tenantId_fkey";

-- RenameForeignKey
ALTER TABLE "mb_customer_reminder" RENAME CONSTRAINT "CustomerReminder_customerId_fkey" TO "mb_customer_reminder_customerId_fkey";

-- RenameForeignKey
ALTER TABLE "mb_customer_reminder" RENAME CONSTRAINT "CustomerReminder_tenantId_fkey" TO "mb_customer_reminder_tenantId_fkey";

-- RenameForeignKey
ALTER TABLE "mb_financial_entry" RENAME CONSTRAINT "FinancialEntry_shopId_fkey" TO "mb_financial_entry_shopId_fkey";

-- RenameForeignKey
ALTER TABLE "mb_financial_entry" RENAME CONSTRAINT "FinancialEntry_tenantId_fkey" TO "mb_financial_entry_tenantId_fkey";

-- RenameForeignKey
ALTER TABLE "mb_global_product" RENAME CONSTRAINT "GlobalProduct_categoryId_fkey" TO "mb_global_product_categoryId_fkey";

-- RenameForeignKey
ALTER TABLE "mb_global_product" RENAME CONSTRAINT "GlobalProduct_hsnId_fkey" TO "mb_global_product_hsnId_fkey";

-- RenameForeignKey
ALTER TABLE "mb_i_m_e_i" RENAME CONSTRAINT "IMEI_invoiceId_fkey" TO "mb_i_m_e_i_invoiceId_fkey";

-- RenameForeignKey
ALTER TABLE "mb_i_m_e_i" RENAME CONSTRAINT "IMEI_shopProductId_fkey" TO "mb_i_m_e_i_shopProductId_fkey";

-- RenameForeignKey
ALTER TABLE "mb_i_m_e_i" RENAME CONSTRAINT "IMEI_tenantId_fkey" TO "mb_i_m_e_i_tenantId_fkey";

-- RenameForeignKey
ALTER TABLE "mb_i_m_e_i" RENAME CONSTRAINT "IMEI_transferredToShopId_fkey" TO "mb_i_m_e_i_transferredToShopId_fkey";

-- RenameForeignKey
ALTER TABLE "mb_invoice" RENAME CONSTRAINT "Invoice_customerId_fkey" TO "mb_invoice_customerId_fkey";

-- RenameForeignKey
ALTER TABLE "mb_invoice" RENAME CONSTRAINT "Invoice_jobCardId_fkey" TO "mb_invoice_jobCardId_fkey";

-- RenameForeignKey
ALTER TABLE "mb_invoice" RENAME CONSTRAINT "Invoice_shopId_fkey" TO "mb_invoice_shopId_fkey";

-- RenameForeignKey
ALTER TABLE "mb_invoice" RENAME CONSTRAINT "Invoice_tenantId_fkey" TO "mb_invoice_tenantId_fkey";

-- RenameForeignKey
ALTER TABLE "mb_invoice_item" RENAME CONSTRAINT "InvoiceItem_invoiceId_fkey" TO "mb_invoice_item_invoiceId_fkey";

-- RenameForeignKey
ALTER TABLE "mb_invoice_item" RENAME CONSTRAINT "InvoiceItem_shopProductId_fkey" TO "mb_invoice_item_shopProductId_fkey";

-- RenameForeignKey
ALTER TABLE "mb_job_card" RENAME CONSTRAINT "JobCard_assignedToUserId_fkey" TO "mb_job_card_assignedToUserId_fkey";

-- RenameForeignKey
ALTER TABLE "mb_job_card" RENAME CONSTRAINT "JobCard_customerId_fkey" TO "mb_job_card_customerId_fkey";

-- RenameForeignKey
ALTER TABLE "mb_job_card" RENAME CONSTRAINT "JobCard_shopId_fkey" TO "mb_job_card_shopId_fkey";

-- RenameForeignKey
ALTER TABLE "mb_job_card" RENAME CONSTRAINT "JobCard_tenantId_fkey" TO "mb_job_card_tenantId_fkey";

-- RenameForeignKey
ALTER TABLE "mb_job_card_part" RENAME CONSTRAINT "JobCardPart_jobCardId_fkey" TO "mb_job_card_part_jobCardId_fkey";

-- RenameForeignKey
ALTER TABLE "mb_job_card_part" RENAME CONSTRAINT "JobCardPart_shopProductId_fkey" TO "mb_job_card_part_shopProductId_fkey";

-- RenameForeignKey
ALTER TABLE "mb_loyalty_config" RENAME CONSTRAINT "LoyaltyConfig_tenantId_fkey" TO "mb_loyalty_config_tenantId_fkey";

-- RenameForeignKey
ALTER TABLE "mb_loyalty_transaction" RENAME CONSTRAINT "LoyaltyTransaction_customerId_fkey" TO "mb_loyalty_transaction_customerId_fkey";

-- RenameForeignKey
ALTER TABLE "mb_loyalty_transaction" RENAME CONSTRAINT "LoyaltyTransaction_tenantId_fkey" TO "mb_loyalty_transaction_tenantId_fkey";

-- RenameForeignKey
ALTER TABLE "mb_party" RENAME CONSTRAINT "Party_tenantId_fkey" TO "mb_party_tenantId_fkey";

-- RenameForeignKey
ALTER TABLE "mb_payment_voucher" RENAME CONSTRAINT "PaymentVoucher_globalSupplierId_fkey" TO "mb_payment_voucher_globalSupplierId_fkey";

-- RenameForeignKey
ALTER TABLE "mb_payment_voucher" RENAME CONSTRAINT "PaymentVoucher_shopId_fkey" TO "mb_payment_voucher_shopId_fkey";

-- RenameForeignKey
ALTER TABLE "mb_payment_voucher" RENAME CONSTRAINT "PaymentVoucher_tenantId_fkey" TO "mb_payment_voucher_tenantId_fkey";

-- RenameForeignKey
ALTER TABLE "mb_purchase" RENAME CONSTRAINT "Purchase_globalSupplierId_fkey" TO "mb_purchase_globalSupplierId_fkey";

-- RenameForeignKey
ALTER TABLE "mb_purchase" RENAME CONSTRAINT "Purchase_shopId_fkey" TO "mb_purchase_shopId_fkey";

-- RenameForeignKey
ALTER TABLE "mb_purchase" RENAME CONSTRAINT "Purchase_tenantId_fkey" TO "mb_purchase_tenantId_fkey";

-- RenameForeignKey
ALTER TABLE "mb_purchase_item" RENAME CONSTRAINT "PurchaseItem_purchaseId_fkey" TO "mb_purchase_item_purchaseId_fkey";

-- RenameForeignKey
ALTER TABLE "mb_purchase_item" RENAME CONSTRAINT "PurchaseItem_shopProductId_fkey" TO "mb_purchase_item_shopProductId_fkey";

-- RenameForeignKey
ALTER TABLE "mb_purchase_order" RENAME CONSTRAINT "PurchaseOrder_globalSupplierId_fkey" TO "mb_purchase_order_globalSupplierId_fkey";

-- RenameForeignKey
ALTER TABLE "mb_purchase_order" RENAME CONSTRAINT "PurchaseOrder_shopId_fkey" TO "mb_purchase_order_shopId_fkey";

-- RenameForeignKey
ALTER TABLE "mb_purchase_order" RENAME CONSTRAINT "PurchaseOrder_tenantId_fkey" TO "mb_purchase_order_tenantId_fkey";

-- RenameForeignKey
ALTER TABLE "mb_purchase_order_item" RENAME CONSTRAINT "PurchaseOrderItem_poId_fkey" TO "mb_purchase_order_item_poId_fkey";

-- RenameForeignKey
ALTER TABLE "mb_quotation" RENAME CONSTRAINT "Quotation_customerId_fkey" TO "mb_quotation_customerId_fkey";

-- RenameForeignKey
ALTER TABLE "mb_quotation" RENAME CONSTRAINT "Quotation_shopId_fkey" TO "mb_quotation_shopId_fkey";

-- RenameForeignKey
ALTER TABLE "mb_quotation" RENAME CONSTRAINT "Quotation_tenantId_fkey" TO "mb_quotation_tenantId_fkey";

-- RenameForeignKey
ALTER TABLE "mb_quotation_item" RENAME CONSTRAINT "QuotationItem_quotationId_fkey" TO "mb_quotation_item_quotationId_fkey";

-- RenameForeignKey
ALTER TABLE "mb_receipt" RENAME CONSTRAINT "Receipt_customerId_fkey" TO "mb_receipt_customerId_fkey";

-- RenameForeignKey
ALTER TABLE "mb_receipt" RENAME CONSTRAINT "Receipt_linkedInvoiceId_fkey" TO "mb_receipt_linkedInvoiceId_fkey";

-- RenameForeignKey
ALTER TABLE "mb_receipt" RENAME CONSTRAINT "Receipt_linkedJobCardId_fkey" TO "mb_receipt_linkedJobCardId_fkey";

-- RenameForeignKey
ALTER TABLE "mb_receipt" RENAME CONSTRAINT "Receipt_shopId_fkey" TO "mb_receipt_shopId_fkey";

-- RenameForeignKey
ALTER TABLE "mb_receipt" RENAME CONSTRAINT "Receipt_tenantId_fkey" TO "mb_receipt_tenantId_fkey";

-- RenameForeignKey
ALTER TABLE "mb_shop" RENAME CONSTRAINT "Shop_tenantId_fkey" TO "mb_shop_tenantId_fkey";

-- RenameForeignKey
ALTER TABLE "mb_shop_document_setting" RENAME CONSTRAINT "ShopDocumentSetting_shopId_fkey" TO "mb_shop_document_setting_shopId_fkey";

-- RenameForeignKey
ALTER TABLE "mb_shop_product" RENAME CONSTRAINT "ShopProduct_globalProductId_fkey" TO "mb_shop_product_globalProductId_fkey";

-- RenameForeignKey
ALTER TABLE "mb_shop_product" RENAME CONSTRAINT "ShopProduct_shopId_fkey" TO "mb_shop_product_shopId_fkey";

-- RenameForeignKey
ALTER TABLE "mb_shop_product" RENAME CONSTRAINT "ShopProduct_tenantId_fkey" TO "mb_shop_product_tenantId_fkey";

-- RenameForeignKey
ALTER TABLE "mb_shop_staff" RENAME CONSTRAINT "ShopStaff_shopId_fkey" TO "mb_shop_staff_shopId_fkey";

-- RenameForeignKey
ALTER TABLE "mb_shop_staff" RENAME CONSTRAINT "ShopStaff_tenantId_fkey" TO "mb_shop_staff_tenantId_fkey";

-- RenameForeignKey
ALTER TABLE "mb_shop_staff" RENAME CONSTRAINT "ShopStaff_userId_fkey" TO "mb_shop_staff_userId_fkey";

-- RenameForeignKey
ALTER TABLE "mb_stock_correction" RENAME CONSTRAINT "StockCorrection_shopId_fkey" TO "mb_stock_correction_shopId_fkey";

-- RenameForeignKey
ALTER TABLE "mb_stock_correction" RENAME CONSTRAINT "StockCorrection_shopProductId_fkey" TO "mb_stock_correction_shopProductId_fkey";

-- RenameForeignKey
ALTER TABLE "mb_stock_correction" RENAME CONSTRAINT "StockCorrection_tenantId_fkey" TO "mb_stock_correction_tenantId_fkey";

-- RenameForeignKey
ALTER TABLE "mb_stock_ledger" RENAME CONSTRAINT "StockLedger_shopId_fkey" TO "mb_stock_ledger_shopId_fkey";

-- RenameForeignKey
ALTER TABLE "mb_stock_ledger" RENAME CONSTRAINT "StockLedger_shopProductId_fkey" TO "mb_stock_ledger_shopProductId_fkey";

-- RenameForeignKey
ALTER TABLE "mb_stock_ledger" RENAME CONSTRAINT "StockLedger_tenantId_fkey" TO "mb_stock_ledger_tenantId_fkey";

-- RenameForeignKey
ALTER TABLE "mb_supplier_payment" RENAME CONSTRAINT "SupplierPayment_globalSupplierId_fkey" TO "mb_supplier_payment_globalSupplierId_fkey";

-- RenameForeignKey
ALTER TABLE "mb_supplier_payment" RENAME CONSTRAINT "SupplierPayment_purchaseId_fkey" TO "mb_supplier_payment_purchaseId_fkey";

-- RenameForeignKey
ALTER TABLE "mb_supplier_payment" RENAME CONSTRAINT "SupplierPayment_tenantId_fkey" TO "mb_supplier_payment_tenantId_fkey";

-- AddForeignKey
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_businessCategoryId_fkey" FOREIGN KEY ("businessCategoryId") REFERENCES "BusinessCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_promoCodeId_fkey" FOREIGN KEY ("promoCodeId") REFERENCES "PromoCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_whatsappReminderNumberId_fkey" FOREIGN KEY ("whatsappReminderNumberId") REFERENCES "WhatsAppPhoneNumber"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeletionRequest" ADD CONSTRAINT "DeletionRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_notification_log" ADD CONSTRAINT "mb_notification_log_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_notification_log" ADD CONSTRAINT "mb_notification_log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_contact" ADD CONSTRAINT "mb_contact_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gp_member" ADD CONSTRAINT "gp_member_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "mb_contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_party" ADD CONSTRAINT "mb_party_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "mb_contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_party" ADD CONSTRAINT "mb_party_mergedIntoId_fkey" FOREIGN KEY ("mergedIntoId") REFERENCES "mb_party"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "mb_loyalty_adjustment" ADD CONSTRAINT "mb_loyalty_adjustment_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "mb_party"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_loyalty_adjustment" ADD CONSTRAINT "mb_loyalty_adjustment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_supplier_profile" ADD CONSTRAINT "mb_supplier_profile_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "mb_party"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_customer_follow_up" ADD CONSTRAINT "mb_customer_follow_up_sourceQuotationId_fkey" FOREIGN KEY ("sourceQuotationId") REFERENCES "mb_quotation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_customer_note" ADD CONSTRAINT "mb_customer_note_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_customer_note" ADD CONSTRAINT "mb_customer_note_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "mb_party"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_customer_note" ADD CONSTRAINT "mb_customer_note_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_loyalty_config" ADD CONSTRAINT "mb_loyalty_config_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "mb_shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_loyalty_transaction" ADD CONSTRAINT "mb_loyalty_transaction_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "mb_shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lg_ledger_customer" ADD CONSTRAINT "lg_ledger_customer_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "mb_party"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffInvite" ADD CONSTRAINT "StaffInvite_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffInvite" ADD CONSTRAINT "StaffInvite_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRetry" ADD CONSTRAINT "PaymentRetry_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionInvoice" ADD CONSTRAINT "SubscriptionInvoice_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionInvoice" ADD CONSTRAINT "SubscriptionInvoice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppPhoneNumber" ADD CONSTRAINT "WhatsAppPhoneNumber_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppLog" ADD CONSTRAINT "WhatsAppLog_whatsAppNumberId_fkey" FOREIGN KEY ("whatsAppNumberId") REFERENCES "WhatsAppPhoneNumber"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_shop_staff" ADD CONSTRAINT "mb_shop_staff_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_job_card" ADD CONSTRAINT "mb_job_card_faultTypeId_fkey" FOREIGN KEY ("faultTypeId") REFERENCES "mb_repair_fault_type"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_job_card_qc" ADD CONSTRAINT "mb_job_card_qc_jobCardId_fkey" FOREIGN KEY ("jobCardId") REFERENCES "mb_job_card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_fault_diagnosis" ADD CONSTRAINT "mb_fault_diagnosis_faultTypeId_fkey" FOREIGN KEY ("faultTypeId") REFERENCES "mb_repair_fault_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_fault_diagnosis_step" ADD CONSTRAINT "mb_fault_diagnosis_step_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "mb_fault_diagnosis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_repair_knowledge" ADD CONSTRAINT "mb_repair_knowledge_faultTypeId_fkey" FOREIGN KEY ("faultTypeId") REFERENCES "mb_repair_fault_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_repair_knowledge" ADD CONSTRAINT "mb_repair_knowledge_phoneModelId_fkey" FOREIGN KEY ("phoneModelId") REFERENCES "mb_compatibility_phone_model"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_shop_product" ADD CONSTRAINT "mb_shop_product_compatibilityGroupId_fkey" FOREIGN KEY ("compatibilityGroupId") REFERENCES "mb_compatibility_group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_purchase" ADD CONSTRAINT "mb_purchase_poId_fkey" FOREIGN KEY ("poId") REFERENCES "mb_purchase_order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_payment_voucher" ADD CONSTRAINT "mb_payment_voucher_expenseCategoryId_fkey" FOREIGN KEY ("expenseCategoryId") REFERENCES "mb_expense_category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_quotation" ADD CONSTRAINT "mb_quotation_linkedInvoiceId_fkey" FOREIGN KEY ("linkedInvoiceId") REFERENCES "mb_invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_quotation" ADD CONSTRAINT "mb_quotation_linkedJobCardId_fkey" FOREIGN KEY ("linkedJobCardId") REFERENCES "mb_job_card"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_quotation_item" ADD CONSTRAINT "mb_quotation_item_shopProductId_fkey" FOREIGN KEY ("shopProductId") REFERENCES "mb_shop_product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_grn" ADD CONSTRAINT "mb_grn_poId_fkey" FOREIGN KEY ("poId") REFERENCES "mb_purchase_order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_grn_item" ADD CONSTRAINT "mb_grn_item_grnId_fkey" FOREIGN KEY ("grnId") REFERENCES "mb_grn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_grn_item" ADD CONSTRAINT "mb_grn_item_poItemId_fkey" FOREIGN KEY ("poItemId") REFERENCES "mb_purchase_order_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_grn_item" ADD CONSTRAINT "mb_grn_item_shopProductId_fkey" FOREIGN KEY ("shopProductId") REFERENCES "mb_shop_product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_compatibility_phone_model" ADD CONSTRAINT "mb_compatibility_phone_model_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "mb_compatibility_brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_compatibility_group_phone" ADD CONSTRAINT "mb_compatibility_group_phone_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "mb_compatibility_group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_compatibility_group_phone" ADD CONSTRAINT "mb_compatibility_group_phone_phoneModelId_fkey" FOREIGN KEY ("phoneModelId") REFERENCES "mb_compatibility_phone_model"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_part_compatibility" ADD CONSTRAINT "mb_part_compatibility_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "mb_compatibility_group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_part_compatibility" ADD CONSTRAINT "mb_part_compatibility_partId_fkey" FOREIGN KEY ("partId") REFERENCES "mb_compatibility_part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_compatibility_feedback" ADD CONSTRAINT "mb_compatibility_feedback_phoneModelId_fkey" FOREIGN KEY ("phoneModelId") REFERENCES "mb_compatibility_phone_model"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_compatibility_feedback" ADD CONSTRAINT "mb_compatibility_feedback_targetModelId_fkey" FOREIGN KEY ("targetModelId") REFERENCES "mb_compatibility_phone_model"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureFlag" ADD CONSTRAINT "FeatureFlag_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "mb_shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureFlag" ADD CONSTRAINT "FeatureFlag_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "mb_party"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleVersion" ADD CONSTRAINT "RoleVersion_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Permission" ADD CONSTRAINT "Permission_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_resolvedBy_fkey" FOREIGN KEY ("resolvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "mb_shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_distributor_tenant_link" ADD CONSTRAINT "mb_distributor_tenant_link_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "mb_distributor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_distributor_tenant_link" ADD CONSTRAINT "mb_distributor_tenant_link_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_wholesale_catalog" ADD CONSTRAINT "mb_wholesale_catalog_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "mb_distributor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_b2_b_purchase_order" ADD CONSTRAINT "mb_b2_b_purchase_order_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "mb_distributor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_b2_b_purchase_order" ADD CONSTRAINT "mb_b2_b_purchase_order_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_b2_b_order_item" ADD CONSTRAINT "mb_b2_b_order_item_catalogItemId_fkey" FOREIGN KEY ("catalogItemId") REFERENCES "mb_wholesale_catalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_b2_b_order_item" ADD CONSTRAINT "mb_b2_b_order_item_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "mb_b2_b_purchase_order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromoCode" ADD CONSTRAINT "PromoCode_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_partner_referral" ADD CONSTRAINT "mb_partner_referral_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_partner_notification" ADD CONSTRAINT "mb_partner_notification_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminUser" ADD CONSTRAINT "AdminUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_usage_logs" ADD CONSTRAINT "ai_usage_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_usages" ADD CONSTRAINT "promo_usages_promoId_fkey" FOREIGN KEY ("promoId") REFERENCES "PromoCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_usages" ADD CONSTRAINT "promo_usages_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_usages" ADD CONSTRAINT "promo_usages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingEventLog" ADD CONSTRAINT "BillingEventLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_credit_note" ADD CONSTRAINT "mb_credit_note_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "mb_party"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_credit_note" ADD CONSTRAINT "mb_credit_note_linkedInvoiceId_fkey" FOREIGN KEY ("linkedInvoiceId") REFERENCES "mb_invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_credit_note" ADD CONSTRAINT "mb_credit_note_linkedPurchaseId_fkey" FOREIGN KEY ("linkedPurchaseId") REFERENCES "mb_purchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_credit_note" ADD CONSTRAINT "mb_credit_note_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "mb_shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_credit_note" ADD CONSTRAINT "mb_credit_note_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "mb_party"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_credit_note" ADD CONSTRAINT "mb_credit_note_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_credit_note_item" ADD CONSTRAINT "mb_credit_note_item_creditNoteId_fkey" FOREIGN KEY ("creditNoteId") REFERENCES "mb_credit_note"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_credit_note_item" ADD CONSTRAINT "mb_credit_note_item_shopProductId_fkey" FOREIGN KEY ("shopProductId") REFERENCES "mb_shop_product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_credit_note_application" ADD CONSTRAINT "mb_credit_note_application_creditNoteId_fkey" FOREIGN KEY ("creditNoteId") REFERENCES "mb_credit_note"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_credit_note_application" ADD CONSTRAINT "mb_credit_note_application_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "mb_invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_credit_note_application" ADD CONSTRAINT "mb_credit_note_application_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "mb_purchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_daily_closing" ADD CONSTRAINT "mb_daily_closing_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "mb_shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_daily_closing" ADD CONSTRAINT "mb_daily_closing_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_shift_closing" ADD CONSTRAINT "mb_shift_closing_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "mb_shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_shift_closing" ADD CONSTRAINT "mb_shift_closing_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_cash_variance" ADD CONSTRAINT "mb_cash_variance_dailyClosingId_fkey" FOREIGN KEY ("dailyClosingId") REFERENCES "mb_daily_closing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_cash_variance" ADD CONSTRAINT "mb_cash_variance_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "mb_shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_cash_variance" ADD CONSTRAINT "mb_cash_variance_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_stock_verification" ADD CONSTRAINT "mb_stock_verification_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "mb_shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_stock_verification" ADD CONSTRAINT "mb_stock_verification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_stock_verification_item" ADD CONSTRAINT "mb_stock_verification_item_shopProductId_fkey" FOREIGN KEY ("shopProductId") REFERENCES "mb_shop_product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_stock_verification_item" ADD CONSTRAINT "mb_stock_verification_item_verificationId_fkey" FOREIGN KEY ("verificationId") REFERENCES "mb_stock_verification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_daily_metrics" ADD CONSTRAINT "mb_daily_metrics_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "mb_shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_daily_metrics" ADD CONSTRAINT "mb_daily_metrics_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_tenant_health_scores" ADD CONSTRAINT "admin_tenant_health_scores_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_tradein_voucher" ADD CONSTRAINT "mb_tradein_voucher_tradeInId_fkey" FOREIGN KEY ("tradeInId") REFERENCES "mb_trade_in"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_emi_application" ADD CONSTRAINT "mb_emi_application_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "mb_invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_installment_plan" ADD CONSTRAINT "mb_installment_plan_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "mb_invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mb_installment_plan" ADD CONSTRAINT "mb_installment_plan_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "mb_party"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "GymAttendance_memberId_idx" RENAME TO "gp_gym_attendance_memberId_idx";

-- RenameIndex
ALTER INDEX "GymAttendance_tenantId_idx" RENAME TO "gp_gym_attendance_tenantId_idx";

-- RenameIndex
ALTER INDEX "GymMembership_memberId_idx" RENAME TO "gp_gym_membership_memberId_idx";

-- RenameIndex
ALTER INDEX "GymMembership_tenantId_idx" RENAME TO "gp_gym_membership_tenantId_idx";

-- RenameIndex
ALTER INDEX "Member_id_tenantId_key" RENAME TO "gp_member_id_tenantId_key";

-- RenameIndex
ALTER INDEX "Member_tenantId_idx" RENAME TO "gp_member_tenantId_idx";

-- RenameIndex
ALTER INDEX "Member_tenantId_phone_key" RENAME TO "gp_member_tenantId_phone_key";

-- RenameIndex
ALTER INDEX "MemberPayment_memberId_idx" RENAME TO "gp_member_payment_memberId_idx";

-- RenameIndex
ALTER INDEX "MemberPayment_tenantId_idx" RENAME TO "gp_member_payment_tenantId_idx";

-- RenameIndex
ALTER INDEX "LedgerAccount_customerId_idx" RENAME TO "lg_ledger_account_customerId_idx";

-- RenameIndex
ALTER INDEX "LedgerAccount_tenantId_idx" RENAME TO "lg_ledger_account_tenantId_idx";

-- RenameIndex
ALTER INDEX "LedgerCollection_ledgerId_idx" RENAME TO "lg_ledger_collection_ledgerId_idx";

-- RenameIndex
ALTER INDEX "LedgerCollection_tenantId_idx" RENAME TO "lg_ledger_collection_tenantId_idx";

-- RenameIndex
ALTER INDEX "LedgerCustomer_tenantId_idx" RENAME TO "lg_ledger_customer_tenantId_idx";

-- RenameIndex
ALTER INDEX "LedgerCustomer_tenantId_phone_key" RENAME TO "lg_ledger_customer_tenantId_phone_key";

-- RenameIndex
ALTER INDEX "LedgerPayment_collectedBy_idx" RENAME TO "lg_ledger_payment_collectedBy_idx";

-- RenameIndex
ALTER INDEX "LedgerPayment_collectionId_idx" RENAME TO "lg_ledger_payment_collectionId_idx";

-- RenameIndex
ALTER INDEX "LedgerPayment_customerId_idx" RENAME TO "lg_ledger_payment_customerId_idx";

-- RenameIndex
ALTER INDEX "LedgerPayment_ledgerId_idx" RENAME TO "lg_ledger_payment_ledgerId_idx";

-- RenameIndex
ALTER INDEX "LedgerPayment_tenantId_idx" RENAME TO "lg_ledger_payment_tenantId_idx";

-- RenameIndex
ALTER INDEX "AdvanceApplication_advanceVoucherId_idx" RENAME TO "mb_advance_application_advanceVoucherId_idx";

-- RenameIndex
ALTER INDEX "AdvanceApplication_advanceVoucherId_purchaseId_key" RENAME TO "mb_advance_application_advanceVoucherId_purchaseId_key";

-- RenameIndex
ALTER INDEX "AdvanceApplication_purchaseId_idx" RENAME TO "mb_advance_application_purchaseId_idx";

-- RenameIndex
ALTER INDEX "CustomerAlert_createdAt_idx" RENAME TO "mb_customer_alert_createdAt_idx";

-- RenameIndex
ALTER INDEX "CustomerAlert_customerId_idx" RENAME TO "mb_customer_alert_customerId_idx";

-- RenameIndex
ALTER INDEX "CustomerAlert_resolved_idx" RENAME TO "mb_customer_alert_resolved_idx";

-- RenameIndex
ALTER INDEX "CustomerAlert_severity_idx" RENAME TO "mb_customer_alert_severity_idx";

-- RenameIndex
ALTER INDEX "CustomerAlert_tenantId_idx" RENAME TO "mb_customer_alert_tenantId_idx";

-- RenameIndex
ALTER INDEX "CustomerFollowUp_assignedToUserId_idx" RENAME TO "mb_customer_follow_up_assignedToUserId_idx";

-- RenameIndex
ALTER INDEX "CustomerFollowUp_customerId_idx" RENAME TO "mb_customer_follow_up_customerId_idx";

-- RenameIndex
ALTER INDEX "CustomerFollowUp_followUpAt_idx" RENAME TO "mb_customer_follow_up_followUpAt_idx";

-- RenameIndex
ALTER INDEX "CustomerFollowUp_shopId_idx" RENAME TO "mb_customer_follow_up_shopId_idx";

-- RenameIndex
ALTER INDEX "CustomerFollowUp_status_idx" RENAME TO "mb_customer_follow_up_status_idx";

-- RenameIndex
ALTER INDEX "CustomerFollowUp_tenantId_idx" RENAME TO "mb_customer_follow_up_tenantId_idx";

-- RenameIndex
ALTER INDEX "CustomerReminder_customerId_idx" RENAME TO "mb_customer_reminder_customerId_idx";

-- RenameIndex
ALTER INDEX "CustomerReminder_scheduledAt_idx" RENAME TO "mb_customer_reminder_scheduledAt_idx";

-- RenameIndex
ALTER INDEX "CustomerReminder_status_idx" RENAME TO "mb_customer_reminder_status_idx";

-- RenameIndex
ALTER INDEX "CustomerReminder_tenantId_idx" RENAME TO "mb_customer_reminder_tenantId_idx";

-- RenameIndex
ALTER INDEX "mb_device_model_request_brand_model_idx" RENAME TO "mb_device_model_request_parsedBrand_parsedModel_idx";

-- RenameIndex
ALTER INDEX "FinancialEntry_shopId_idx" RENAME TO "mb_financial_entry_shopId_idx";

-- RenameIndex
ALTER INDEX "FinancialEntry_tenantId_idx" RENAME TO "mb_financial_entry_tenantId_idx";

-- RenameIndex
ALTER INDEX "GlobalProduct_categoryId_idx" RENAME TO "mb_global_product_categoryId_idx";

-- RenameIndex
ALTER INDEX "GlobalProduct_hsnId_idx" RENAME TO "mb_global_product_hsnId_idx";

-- RenameIndex
ALTER INDEX "GlobalProduct_name_categoryId_key" RENAME TO "mb_global_product_name_categoryId_key";

-- RenameIndex
ALTER INDEX "HSNCode_code_key" RENAME TO "mb_h_s_n_code_code_key";

-- RenameIndex
ALTER INDEX "IMEI_invoiceId_idx" RENAME TO "mb_i_m_e_i_invoiceId_idx";

-- RenameIndex
ALTER INDEX "IMEI_shopProductId_idx" RENAME TO "mb_i_m_e_i_shopProductId_idx";

-- RenameIndex
ALTER INDEX "IMEI_status_idx" RENAME TO "mb_i_m_e_i_status_idx";

-- RenameIndex
ALTER INDEX "IMEI_tenantId_idx" RENAME TO "mb_i_m_e_i_tenantId_idx";

-- RenameIndex
ALTER INDEX "IMEI_tenantId_imei_key" RENAME TO "mb_i_m_e_i_tenantId_imei_key";

-- RenameIndex
ALTER INDEX "IMEI_transferredToShopId_idx" RENAME TO "mb_i_m_e_i_transferredToShopId_idx";

-- RenameIndex
ALTER INDEX "mb_installment_plan_shopId_planNumber" RENAME TO "mb_installment_plan_shopId_planNumber_key";

-- RenameIndex
ALTER INDEX "Invoice_customerId_idx" RENAME TO "mb_invoice_customerId_idx";

-- RenameIndex
ALTER INDEX "Invoice_shopId_idx" RENAME TO "mb_invoice_shopId_idx";

-- RenameIndex
ALTER INDEX "Invoice_tenantId_idx" RENAME TO "mb_invoice_tenantId_idx";

-- RenameIndex
ALTER INDEX "Invoice_tenantId_shopId_createdAt_idx" RENAME TO "mb_invoice_tenantId_shopId_createdAt_idx";

-- RenameIndex
ALTER INDEX "InvoiceItem_invoiceId_idx" RENAME TO "mb_invoice_item_invoiceId_idx";

-- RenameIndex
ALTER INDEX "JobCard_customerId_idx" RENAME TO "mb_job_card_customerId_idx";

-- RenameIndex
ALTER INDEX "JobCard_publicToken_key" RENAME TO "mb_job_card_publicToken_key";

-- RenameIndex
ALTER INDEX "JobCard_shopId_idx" RENAME TO "mb_job_card_shopId_idx";

-- RenameIndex
ALTER INDEX "JobCard_shopId_jobNumber_key" RENAME TO "mb_job_card_shopId_jobNumber_key";

-- RenameIndex
ALTER INDEX "JobCard_tenantId_idx" RENAME TO "mb_job_card_tenantId_idx";

-- RenameIndex
ALTER INDEX "JobCard_tenantId_shopId_status_createdAt_idx" RENAME TO "mb_job_card_tenantId_shopId_status_createdAt_idx";

-- RenameIndex
ALTER INDEX "JobCardPart_jobCardId_idx" RENAME TO "mb_job_card_part_jobCardId_idx";

-- RenameIndex
ALTER INDEX "JobCardPart_jobCardId_shopProductId_key" RENAME TO "mb_job_card_part_jobCardId_shopProductId_key";

-- RenameIndex
ALTER INDEX "JobCardPart_shopProductId_idx" RENAME TO "mb_job_card_part_shopProductId_idx";

-- RenameIndex
ALTER INDEX "LoyaltyConfig_tenantId_idx" RENAME TO "mb_loyalty_config_tenantId_idx";

-- RenameIndex
ALTER INDEX "LoyaltyTransaction_createdAt_idx" RENAME TO "mb_loyalty_transaction_createdAt_idx";

-- RenameIndex
ALTER INDEX "LoyaltyTransaction_customerId_idx" RENAME TO "mb_loyalty_transaction_customerId_idx";

-- RenameIndex
ALTER INDEX "LoyaltyTransaction_invoiceId_idx" RENAME TO "mb_loyalty_transaction_invoiceId_idx";

-- RenameIndex
ALTER INDEX "LoyaltyTransaction_reversalOf_idx" RENAME TO "mb_loyalty_transaction_reversalOf_idx";

-- RenameIndex
ALTER INDEX "LoyaltyTransaction_tenantId_idx" RENAME TO "mb_loyalty_transaction_tenantId_idx";

-- RenameIndex
ALTER INDEX "Party_tenantId_idx" RENAME TO "mb_party_tenantId_idx";

-- RenameIndex
ALTER INDEX "Party_tenantId_phone_key" RENAME TO "mb_party_tenantId_phone_key";

-- RenameIndex
ALTER INDEX "PaymentVoucher_shopId_idx" RENAME TO "mb_payment_voucher_shopId_idx";

-- RenameIndex
ALTER INDEX "PaymentVoucher_tenantId_idx" RENAME TO "mb_payment_voucher_tenantId_idx";

-- RenameIndex
ALTER INDEX "PaymentVoucher_voucherId_key" RENAME TO "mb_payment_voucher_voucherId_key";

-- RenameIndex
ALTER INDEX "ProductCategory_name_key" RENAME TO "mb_product_category_name_key";

-- RenameIndex
ALTER INDEX "Purchase_globalSupplierId_idx" RENAME TO "mb_purchase_globalSupplierId_idx";

-- RenameIndex
ALTER INDEX "Purchase_shopId_idx" RENAME TO "mb_purchase_shopId_idx";

-- RenameIndex
ALTER INDEX "Purchase_tenantId_idx" RENAME TO "mb_purchase_tenantId_idx";

-- RenameIndex
ALTER INDEX "PurchaseItem_purchaseId_idx" RENAME TO "mb_purchase_item_purchaseId_idx";

-- RenameIndex
ALTER INDEX "PurchaseItem_shopProductId_idx" RENAME TO "mb_purchase_item_shopProductId_idx";

-- RenameIndex
ALTER INDEX "PurchaseOrder_shopId_idx" RENAME TO "mb_purchase_order_shopId_idx";

-- RenameIndex
ALTER INDEX "PurchaseOrder_shopId_poNumber_key" RENAME TO "mb_purchase_order_shopId_poNumber_key";

-- RenameIndex
ALTER INDEX "PurchaseOrder_tenantId_idx" RENAME TO "mb_purchase_order_tenantId_idx";

-- RenameIndex
ALTER INDEX "PurchaseOrderItem_poId_idx" RENAME TO "mb_purchase_order_item_poId_idx";

-- RenameIndex
ALTER INDEX "Quotation_shopId_idx" RENAME TO "mb_quotation_shopId_idx";

-- RenameIndex
ALTER INDEX "Quotation_shopId_quotationNumber_key" RENAME TO "mb_quotation_shopId_quotationNumber_key";

-- RenameIndex
ALTER INDEX "Quotation_tenantId_idx" RENAME TO "mb_quotation_tenantId_idx";

-- RenameIndex
ALTER INDEX "QuotationItem_quotationId_idx" RENAME TO "mb_quotation_item_quotationId_idx";

-- RenameIndex
ALTER INDEX "Receipt_customerId_idx" RENAME TO "mb_receipt_customerId_idx";

-- RenameIndex
ALTER INDEX "Receipt_linkedInvoiceId_idx" RENAME TO "mb_receipt_linkedInvoiceId_idx";

-- RenameIndex
ALTER INDEX "Receipt_linkedJobCardId_idx" RENAME TO "mb_receipt_linkedJobCardId_idx";

-- RenameIndex
ALTER INDEX "Receipt_receiptId_key" RENAME TO "mb_receipt_receiptId_key";

-- RenameIndex
ALTER INDEX "Receipt_shopId_idx" RENAME TO "mb_receipt_shopId_idx";

-- RenameIndex
ALTER INDEX "Receipt_tenantId_idx" RENAME TO "mb_receipt_tenantId_idx";

-- RenameIndex
ALTER INDEX "Shop_tenantId_idx" RENAME TO "mb_shop_tenantId_idx";

-- RenameIndex
ALTER INDEX "Shop_tenantId_invoicePrefix_key" RENAME TO "mb_shop_tenantId_invoicePrefix_key";

-- RenameIndex
ALTER INDEX "ShopDocumentSetting_documentType_idx" RENAME TO "mb_shop_document_setting_documentType_idx";

-- RenameIndex
ALTER INDEX "ShopDocumentSetting_shopId_documentType_key" RENAME TO "mb_shop_document_setting_shopId_documentType_key";

-- RenameIndex
ALTER INDEX "ShopDocumentSetting_shopId_idx" RENAME TO "mb_shop_document_setting_shopId_idx";

-- RenameIndex
ALTER INDEX "ShopProduct_globalProductId_idx" RENAME TO "mb_shop_product_globalProductId_idx";

-- RenameIndex
ALTER INDEX "ShopProduct_shopId_idx" RENAME TO "mb_shop_product_shopId_idx";

-- RenameIndex
ALTER INDEX "ShopProduct_shopId_name_key" RENAME TO "mb_shop_product_shopId_name_key";

-- RenameIndex
ALTER INDEX "ShopProduct_tenantId_idx" RENAME TO "mb_shop_product_tenantId_idx";

-- RenameIndex
ALTER INDEX "ShopProduct_tenantId_shopId_isActive_idx" RENAME TO "mb_shop_product_tenantId_shopId_isActive_idx";

-- RenameIndex
ALTER INDEX "ShopStaff_shopId_idx" RENAME TO "mb_shop_staff_shopId_idx";

-- RenameIndex
ALTER INDEX "ShopStaff_tenantId_idx" RENAME TO "mb_shop_staff_tenantId_idx";

-- RenameIndex
ALTER INDEX "StockCorrection_createdAt_idx" RENAME TO "mb_stock_correction_createdAt_idx";

-- RenameIndex
ALTER INDEX "StockCorrection_shopProductId_idx" RENAME TO "mb_stock_correction_shopProductId_idx";

-- RenameIndex
ALTER INDEX "StockCorrection_tenantId_shopId_idx" RENAME TO "mb_stock_correction_tenantId_shopId_idx";

-- RenameIndex
ALTER INDEX "StockLedger_referenceType_referenceId_idx" RENAME TO "mb_stock_ledger_referenceType_referenceId_idx";

-- RenameIndex
ALTER INDEX "StockLedger_shopProductId_createdAt_idx" RENAME TO "mb_stock_ledger_shopProductId_createdAt_idx";

-- RenameIndex
ALTER INDEX "StockLedger_tenantId_shopId_createdAt_idx" RENAME TO "mb_stock_ledger_tenantId_shopId_createdAt_idx";

-- RenameIndex
ALTER INDEX "StockLedger_tenantId_shopId_type_idx" RENAME TO "mb_stock_ledger_tenantId_shopId_type_idx";

-- RenameIndex
ALTER INDEX "SupplierPayment_purchaseId_idx" RENAME TO "mb_supplier_payment_purchaseId_idx";

-- RenameIndex
ALTER INDEX "SupplierPayment_shopId_idx" RENAME TO "mb_supplier_payment_shopId_idx";

-- RenameIndex
ALTER INDEX "SupplierPayment_tenantId_idx" RENAME TO "mb_supplier_payment_tenantId_idx";
