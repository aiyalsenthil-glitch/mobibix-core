-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('GOODS', 'SPARE', 'SERVICE');

-- CreateEnum
CREATE TYPE "WhatsAppPhoneNumberPurpose" AS ENUM ('REMINDER', 'BILLING', 'MARKETING', 'DEFAULT');

-- CreateEnum
CREATE TYPE "WhatsAppFeature" AS ENUM ('WELCOME', 'EXPIRY', 'PAYMENT_DUE', 'REMINDER');

-- CreateEnum
CREATE TYPE "FinanceType" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "FinanceRefType" AS ENUM ('INVOICE', 'JOB', 'PURCHASE', 'ADJUSTMENT', 'RECEIPT');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('RECEIVED', 'DIAGNOSING', 'WAITING_FOR_PARTS', 'IN_PROGRESS', 'READY', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('PAID', 'CREDIT', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('CASH', 'CARD', 'UPI', 'BANK', 'CREDIT');

-- CreateEnum
CREATE TYPE "StockEntryType" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "StockRefType" AS ENUM ('PURCHASE', 'SALE', 'REPAIR', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'ANNUAL');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'OWNER', 'STAFF', 'USER');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "FitnessGoal" AS ENUM ('WEIGHT_LOSS', 'MUSCLE_GAIN', 'GENERAL_FITNESS', 'WEIGHT_GAIN');

-- CreateEnum
CREATE TYPE "MemberPaymentStatus" AS ENUM ('PAID', 'DUE', 'PARTIAL');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('SUCCESS', 'FAILED', 'PENDING');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'EXPIRED', 'CANCELLED', 'SCHEDULED');

-- CreateEnum
CREATE TYPE "AttendanceSource" AS ENUM ('MANUAL', 'QR', 'BIOMETRIC');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'EXPIRED');

-- CreateEnum
CREATE TYPE "LedgerInstallmentType" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "LedgerStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CLOSED');

-- CreateEnum
CREATE TYPE "PartyType" AS ENUM ('CUSTOMER', 'VENDOR', 'BOTH');

-- CreateEnum
CREATE TYPE "BusinessType" AS ENUM ('B2C', 'B2B');

-- CreateEnum
CREATE TYPE "PurchaseStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReceiptType" AS ENUM ('CUSTOMER', 'GENERAL', 'ADJUSTMENT', 'PAYMENT');

-- CreateEnum
CREATE TYPE "ReceiptStatus" AS ENUM ('ACTIVE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "VoucherType" AS ENUM ('SUPPLIER', 'EXPENSE', 'SALARY', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "VoucherStatus" AS ENUM ('ACTIVE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "QuotationStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "POStatus" AS ENUM ('DRAFT', 'ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "IMEIStatus" AS ENUM ('IN_STOCK', 'SOLD', 'RETURNED', 'DAMAGED', 'TRANSFERRED', 'LOST');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('SALES_INVOICE', 'PURCHASE_INVOICE', 'JOB_CARD', 'RECEIPT', 'QUOTATION', 'PURCHASE_ORDER', 'PAYMENT_VOUCHER');

-- CreateEnum
CREATE TYPE "YearFormat" AS ENUM ('FY', 'YYYY', 'YY', 'NONE');

-- CreateEnum
CREATE TYPE "ResetPolicy" AS ENUM ('NEVER', 'YEARLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "FollowUpType" AS ENUM ('CALL', 'WHATSAPP', 'VISIT', 'EMAIL', 'SMS');

-- CreateEnum
CREATE TYPE "FollowUpPurpose" AS ENUM ('SALE', 'SERVICE', 'PAYMENT', 'FEEDBACK', 'RETENTION', 'OTHER');

-- CreateEnum
CREATE TYPE "FollowUpStatus" AS ENUM ('PENDING', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ModuleType" AS ENUM ('GYM', 'MOBILE_SHOP');

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

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "tenantType" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "website" TEXT,
    "logoUrl" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'India',
    "gstNumber" TEXT,
    "taxId" TEXT,
    "businessType" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "kioskToken" TEXT,
    "maxMembers" INTEGER NOT NULL DEFAULT 50,
    "whatsappEnabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserTenant" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserTenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "REMOVED_AUTH_PROVIDERUid" TEXT NOT NULL,
    "email" TEXT,
    "fullName" TEXT,
    "avatar" TEXT,
    "role" "UserRole" NOT NULL,
    "tenantId" TEXT,
    "permissions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "phone" TEXT,
    "welcomeEmailSent" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "gender" "Gender" NOT NULL,
    "membershipPlanId" TEXT NOT NULL,
    "membershipStartAt" TIMESTAMP(3) NOT NULL,
    "membershipEndAt" TIMESTAMP(3) NOT NULL,
    "feeAmount" INTEGER NOT NULL,
    "paymentStatus" "MemberPaymentStatus" NOT NULL,
    "heightCm" DOUBLE PRECISION NOT NULL,
    "weightKg" DOUBLE PRECISION NOT NULL,
    "fitnessGoal" "FitnessGoal" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "paidAmount" INTEGER NOT NULL DEFAULT 0,
    "monthlyFee" INTEGER NOT NULL,
    "paymentDueDate" TIMESTAMP(3) NOT NULL,
    "paymentReminderSent" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "photoUrl" TEXT,
    "welcomeMessageSent" BOOLEAN NOT NULL DEFAULT false,
    "hasCoaching" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "state" TEXT NOT NULL,
    "gstNumber" TEXT,
    "businessType" "BusinessType" NOT NULL DEFAULT 'B2C',
    "partyType" "PartyType" NOT NULL DEFAULT 'CUSTOMER',
    "loyaltyPoints" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "LedgerCustomer" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerAccount" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "principalAmount" INTEGER NOT NULL,
    "expectedTotal" INTEGER NOT NULL,
    "installmentType" "LedgerInstallmentType" NOT NULL,
    "installmentAmount" INTEGER NOT NULL,
    "totalPeriods" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "status" "LedgerStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerCollection" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ledgerId" TEXT NOT NULL,
    "periodNo" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "amount" INTEGER NOT NULL,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffInvite" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accepted" BOOLEAN NOT NULL DEFAULT false,
    "role" "UserRole" NOT NULL DEFAULT 'STAFF',
    "name" TEXT,
    "phone" TEXT,

    CONSTRAINT "StaffInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberPayment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "MemberPaymentStatus" NOT NULL,
    "method" TEXT,
    "reference" TEXT,
    "gstRate" DOUBLE PRECISION,
    "gstAmount" DOUBLE PRECISION,
    "total" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationDays" INTEGER,

    CONSTRAINT "MemberPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "durationDays" INTEGER NOT NULL,
    "memberLimit" INTEGER NOT NULL DEFAULT 0,
    "maxMembers" INTEGER,
    "features" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "billingCycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY',

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanFeature" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "feature" "WhatsAppFeature" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PlanFeature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantSubscription" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    "expiryReminderSentAt" TIMESTAMP(6),

    CONSTRAINT "TenantSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "PaymentStatus" NOT NULL,
    "provider" TEXT NOT NULL,
    "providerOrderId" TEXT NOT NULL,
    "providerPaymentId" TEXT,
    "providerSignature" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformAuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymMembership" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppSetting" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "provider" TEXT,
    "defaultLanguage" TEXT NOT NULL DEFAULT 'en',
    "dailyLimit" INTEGER,
    "testPhone" TEXT,
    "marketingOptInRequired" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "WhatsAppSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppPhoneNumber" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "phoneNumberId" TEXT NOT NULL,
    "wabaId" TEXT NOT NULL,
    "purpose" "WhatsAppPhoneNumberPurpose" NOT NULL DEFAULT 'DEFAULT',
    "qualityRating" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppPhoneNumber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "memberId" TEXT,
    "phone" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "messageId" TEXT,
    "metadata" JSONB,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),

    CONSTRAINT "WhatsAppLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppTemplate" (
    "id" TEXT NOT NULL,
    "moduleType" TEXT NOT NULL,
    "templateKey" TEXT NOT NULL,
    "metaTemplateName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "variables" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppAutomation" (
    "id" TEXT NOT NULL,
    "moduleType" "ModuleType" NOT NULL,
    "eventType" TEXT NOT NULL,
    "templateKey" TEXT NOT NULL,
    "offsetDays" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "conditions" JSONB,
    "description" TEXT,
    "requiresOptIn" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppAutomation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "referenceId" TEXT,
    "payload" JSONB NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookLog" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "entityId" TEXT,
    "tenantId" TEXT,
    "planId" TEXT,
    "status" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymAttendance" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "checkInTime" TIMESTAMP(3) NOT NULL,
    "checkOutTime" TIMESTAMP(3),
    "source" "AttendanceSource" NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shop" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "gstNumber" TEXT,
    "gstEnabled" BOOLEAN NOT NULL DEFAULT false,
    "invoicePrefix" TEXT NOT NULL,
    "logoUrl" TEXT,
    "website" TEXT,
    "invoiceFooter" TEXT,
    "invoicePrinterType" TEXT DEFAULT 'NORMAL',
    "invoiceTemplate" TEXT DEFAULT 'CLASSIC',
    "jobCardPrinterType" TEXT DEFAULT 'NORMAL',
    "jobCardTemplate" TEXT DEFAULT 'SIMPLE',
    "headerConfig" JSONB,
    "tagline" TEXT,
    "terms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "bankName" TEXT,
    "accountNumber" TEXT,
    "ifscCode" TEXT,
    "branchName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "receiptPrintCounter" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Shop_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "ShopStaff" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'STAFF',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopStaff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobCard" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "customerId" TEXT,
    "jobNumber" TEXT NOT NULL,
    "publicToken" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "customerAltPhone" TEXT,
    "deviceType" TEXT NOT NULL,
    "deviceBrand" TEXT NOT NULL,
    "deviceModel" TEXT NOT NULL,
    "deviceSerial" TEXT,
    "devicePassword" TEXT,
    "customerComplaint" TEXT NOT NULL,
    "physicalCondition" TEXT,
    "estimatedCost" INTEGER,
    "diagnosticCharge" INTEGER DEFAULT 0,
    "advancePaid" INTEGER NOT NULL DEFAULT 0,
    "finalCost" INTEGER,
    "billType" TEXT NOT NULL DEFAULT 'WITHOUT_GST',
    "estimatedDelivery" TIMESTAMP(3),
    "advancePaymentMethod" TEXT,
    "advanceCashAmount" INTEGER,
    "advanceUpiAmount" INTEGER,
    "warrantyDuration" INTEGER DEFAULT 0,
    "consentAcknowledge" BOOLEAN NOT NULL DEFAULT false,
    "consentDataLoss" BOOLEAN NOT NULL DEFAULT false,
    "consentDiagnosticFee" BOOLEAN NOT NULL DEFAULT false,
    "createdByUserId" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'RECEIVED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HSNCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "taxRate" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HSNCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlobalProduct" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "hsnId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GlobalProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopProduct" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "globalProductId" TEXT,
    "name" TEXT NOT NULL,
    "salePrice" INTEGER,
    "costPrice" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "type" "ProductType" NOT NULL,
    "category" TEXT,
    "isSerialized" BOOLEAN NOT NULL DEFAULT false,
    "hsnCode" TEXT,
    "gstRate" DOUBLE PRECISION DEFAULT 0,
    "reorderLevel" INTEGER,
    "reorderQty" INTEGER,
    "barcode" TEXT,
    "location" TEXT,

    CONSTRAINT "ShopProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IMEI" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopProductId" TEXT NOT NULL,
    "imei" TEXT NOT NULL,
    "status" "IMEIStatus" NOT NULL DEFAULT 'IN_STOCK',
    "invoiceId" TEXT,
    "transferredToShopId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "soldAt" TIMESTAMP(3),
    "returnedAt" TIMESTAMP(3),
    "damageNotes" TEXT,
    "lostReason" TEXT,

    CONSTRAINT "IMEI_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockLedger" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "shopProductId" TEXT NOT NULL,
    "type" "StockEntryType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "referenceType" "StockRefType",
    "referenceId" TEXT,
    "costPerUnit" INTEGER,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockCorrection" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "shopProductId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "note" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockCorrection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "customerId" TEXT,
    "invoiceNumber" TEXT NOT NULL,
    "invoiceDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "financialYear" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT,
    "customerGstin" TEXT,
    "customerState" TEXT,
    "subTotal" INTEGER NOT NULL,
    "gstAmount" INTEGER NOT NULL,
    "cgst" INTEGER,
    "sgst" INTEGER,
    "igst" INTEGER,
    "totalAmount" INTEGER NOT NULL,
    "paymentMode" "PaymentMode" NOT NULL,
    "cashAmount" INTEGER,
    "upiAmount" INTEGER,
    "cardAmount" INTEGER,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'PAID',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "shopProductId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "rate" INTEGER NOT NULL,
    "hsnCode" TEXT NOT NULL,
    "gstRate" DOUBLE PRECISION NOT NULL,
    "gstAmount" INTEGER NOT NULL,
    "lineTotal" INTEGER NOT NULL,

    CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepairPartUsed" (
    "id" TEXT NOT NULL,
    "jobCardId" TEXT NOT NULL,
    "shopProductId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "costPerUnit" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RepairPartUsed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialEntry" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "type" "FinanceType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "mode" "PaymentMode" NOT NULL,
    "referenceType" "FinanceRefType",
    "referenceId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancialEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "namelowercase" TEXT NOT NULL,
    "primaryPhone" TEXT NOT NULL,
    "altPhone" TEXT,
    "email" TEXT,
    "gstin" TEXT,
    "address" TEXT,
    "state" TEXT,
    "defaultPaymentTerms" TEXT,
    "defaultCreditLimit" INTEGER,
    "defaultCurrency" TEXT NOT NULL DEFAULT 'INR',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopSupplier" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "globalSupplierId" TEXT,
    "name" TEXT NOT NULL,
    "namelowercase" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "gstin" TEXT,
    "outstandingAmount" INTEGER NOT NULL DEFAULT 0,
    "openPurchasesCount" INTEGER NOT NULL DEFAULT 0,
    "localNotes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "ShopSupplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlobalSupplier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "namelowercase" TEXT NOT NULL,
    "primaryPhone" TEXT,
    "altPhone" TEXT,
    "email" TEXT,
    "gstin" TEXT,
    "address" TEXT,
    "state" TEXT,
    "country" TEXT NOT NULL DEFAULT 'India',
    "defaultPaymentTerms" TEXT,
    "defaultCreditLimit" INTEGER,
    "defaultCurrency" TEXT NOT NULL DEFAULT 'INR',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "GlobalSupplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantGlobalSupplier" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "globalSupplierId" TEXT NOT NULL,
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "localName" TEXT,
    "localPhone" TEXT,
    "localNotes" TEXT,

    CONSTRAINT "TenantGlobalSupplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Purchase" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "globalSupplierId" TEXT,
    "supplierName" TEXT NOT NULL,
    "invoiceDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "subTotal" INTEGER NOT NULL,
    "totalGst" INTEGER NOT NULL,
    "grandTotal" INTEGER NOT NULL,
    "paidAmount" INTEGER NOT NULL DEFAULT 0,
    "paymentMethod" "PaymentMode" NOT NULL,
    "paymentReference" TEXT,
    "cashAmount" INTEGER,
    "upiAmount" INTEGER,
    "purchaseType" TEXT NOT NULL DEFAULT 'Goods',
    "taxInclusive" BOOLEAN NOT NULL DEFAULT false,
    "status" "PurchaseStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseItem" (
    "id" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "shopProductId" TEXT,
    "description" TEXT NOT NULL,
    "hsnSac" TEXT,
    "quantity" INTEGER NOT NULL,
    "purchasePrice" INTEGER NOT NULL,
    "gstRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxAmount" INTEGER NOT NULL DEFAULT 0,
    "totalAmount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierPayment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "purchaseId" TEXT,
    "globalSupplierId" TEXT,
    "amount" INTEGER NOT NULL,
    "paymentMethod" "PaymentMode" NOT NULL,
    "paymentReference" TEXT,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "SupplierPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Receipt" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "receiptId" TEXT NOT NULL,
    "printNumber" TEXT NOT NULL,
    "receiptType" "ReceiptType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "paymentMethod" "PaymentMode" NOT NULL,
    "transactionRef" TEXT,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT,
    "linkedInvoiceId" TEXT,
    "linkedJobId" TEXT,
    "narration" TEXT,
    "status" "ReceiptStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "Receipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentVoucher" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "voucherId" TEXT NOT NULL,
    "voucherType" "VoucherType" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amount" INTEGER NOT NULL,
    "paymentMethod" "PaymentMode" NOT NULL,
    "transactionRef" TEXT,
    "narration" TEXT,
    "globalSupplierId" TEXT,
    "expenseCategory" TEXT,
    "linkedPurchaseId" TEXT,
    "status" "VoucherStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "PaymentVoucher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quotation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "quotationNumber" TEXT NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "quotationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalAmount" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "status" "QuotationStatus" NOT NULL DEFAULT 'DRAFT',
    "validityDays" INTEGER NOT NULL DEFAULT 30,
    "expiryDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "Quotation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuotationItem" (
    "id" TEXT NOT NULL,
    "quotationId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    "totalAmount" INTEGER NOT NULL,

    CONSTRAINT "QuotationItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "poNumber" TEXT NOT NULL,
    "globalSupplierId" TEXT,
    "supplierName" TEXT NOT NULL,
    "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedDelivery" TIMESTAMP(3),
    "totalEstimatedAmount" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "status" "POStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderItem" (
    "id" TEXT NOT NULL,
    "poId" TEXT NOT NULL,
    "globalProductId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "estimatedPrice" INTEGER,
    "receivedQuantity" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PurchaseOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppPhoneNumberModule" (
    "id" TEXT NOT NULL,
    "moduleType" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "phoneNumberId" TEXT NOT NULL,
    "wabaId" TEXT NOT NULL,
    "purpose" "WhatsAppPhoneNumberPurpose" NOT NULL DEFAULT 'DEFAULT',
    "qualityRating" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppPhoneNumberModule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_code_key" ON "Tenant"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_kioskToken_key" ON "Tenant"("kioskToken");

-- CreateIndex
CREATE INDEX "UserTenant_tenantId_idx" ON "UserTenant"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "UserTenant_userId_tenantId_key" ON "UserTenant"("userId", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "User_REMOVED_AUTH_PROVIDERUid_key" ON "User"("REMOVED_AUTH_PROVIDERUid");

-- CreateIndex
CREATE INDEX "Member_tenantId_idx" ON "Member"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Member_id_tenantId_key" ON "Member"("id", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Member_tenantId_phone_key" ON "Member"("tenantId", "phone");

-- CreateIndex
CREATE INDEX "Customer_tenantId_idx" ON "Customer"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_tenantId_phone_key" ON "Customer"("tenantId", "phone");

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
CREATE INDEX "LedgerCustomer_tenantId_idx" ON "LedgerCustomer"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "LedgerCustomer_tenantId_phone_key" ON "LedgerCustomer"("tenantId", "phone");

-- CreateIndex
CREATE INDEX "LedgerAccount_tenantId_idx" ON "LedgerAccount"("tenantId");

-- CreateIndex
CREATE INDEX "LedgerAccount_customerId_idx" ON "LedgerAccount"("customerId");

-- CreateIndex
CREATE INDEX "LedgerCollection_tenantId_idx" ON "LedgerCollection"("tenantId");

-- CreateIndex
CREATE INDEX "LedgerCollection_ledgerId_idx" ON "LedgerCollection"("ledgerId");

-- CreateIndex
CREATE UNIQUE INDEX "StaffInvite_tenantId_email_key" ON "StaffInvite"("tenantId", "email");

-- CreateIndex
CREATE INDEX "MemberPayment_tenantId_idx" ON "MemberPayment"("tenantId");

-- CreateIndex
CREATE INDEX "MemberPayment_memberId_idx" ON "MemberPayment"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_code_key" ON "Plan"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_name_key" ON "Plan"("name");

-- CreateIndex
CREATE INDEX "PlanFeature_planId_idx" ON "PlanFeature"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "PlanFeature_planId_feature_key" ON "PlanFeature"("planId", "feature");

-- CreateIndex
CREATE INDEX "TenantSubscription_tenantId_idx" ON "TenantSubscription"("tenantId");

-- CreateIndex
CREATE INDEX "TenantSubscription_planId_idx" ON "TenantSubscription"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_provider_providerPaymentId_providerOrderId_key" ON "Payment"("provider", "providerPaymentId", "providerOrderId");

-- CreateIndex
CREATE INDEX "PlatformAuditLog_userId_idx" ON "PlatformAuditLog"("userId");

-- CreateIndex
CREATE INDEX "GymMembership_tenantId_idx" ON "GymMembership"("tenantId");

-- CreateIndex
CREATE INDEX "GymMembership_memberId_idx" ON "GymMembership"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppSetting_tenantId_key" ON "WhatsAppSetting"("tenantId");

-- CreateIndex
CREATE INDEX "WhatsAppPhoneNumber_tenantId_isActive_idx" ON "WhatsAppPhoneNumber"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "WhatsAppPhoneNumber_tenantId_purpose_idx" ON "WhatsAppPhoneNumber"("tenantId", "purpose");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppPhoneNumber_tenantId_phoneNumberId_key" ON "WhatsAppPhoneNumber"("tenantId", "phoneNumberId");

-- CreateIndex
CREATE INDEX "WhatsAppLog_tenantId_sentAt_idx" ON "WhatsAppLog"("tenantId", "sentAt");

-- CreateIndex
CREATE INDEX "WhatsAppLog_tenantId_status_idx" ON "WhatsAppLog"("tenantId", "status");

-- CreateIndex
CREATE INDEX "WhatsAppLog_messageId_idx" ON "WhatsAppLog"("messageId");

-- CreateIndex
CREATE INDEX "WhatsAppTemplate_moduleType_idx" ON "WhatsAppTemplate"("moduleType");

-- CreateIndex
CREATE INDEX "WhatsAppTemplate_moduleType_templateKey_idx" ON "WhatsAppTemplate"("moduleType", "templateKey");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppTemplate_moduleType_metaTemplateName_key" ON "WhatsAppTemplate"("moduleType", "metaTemplateName");

-- CreateIndex
CREATE INDEX "WhatsAppAutomation_moduleType_idx" ON "WhatsAppAutomation"("moduleType");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppAutomation_moduleType_eventType_key" ON "WhatsAppAutomation"("moduleType", "eventType");

-- CreateIndex
CREATE INDEX "WebhookLog_tenantId_idx" ON "WebhookLog"("tenantId");

-- CreateIndex
CREATE INDEX "WebhookLog_event_idx" ON "WebhookLog"("event");

-- CreateIndex
CREATE INDEX "GymAttendance_tenantId_idx" ON "GymAttendance"("tenantId");

-- CreateIndex
CREATE INDEX "GymAttendance_memberId_idx" ON "GymAttendance"("memberId");

-- CreateIndex
CREATE INDEX "Shop_tenantId_idx" ON "Shop"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Shop_tenantId_invoicePrefix_key" ON "Shop"("tenantId", "invoicePrefix");

-- CreateIndex
CREATE INDEX "ShopDocumentSetting_shopId_idx" ON "ShopDocumentSetting"("shopId");

-- CreateIndex
CREATE INDEX "ShopDocumentSetting_documentType_idx" ON "ShopDocumentSetting"("documentType");

-- CreateIndex
CREATE UNIQUE INDEX "ShopDocumentSetting_shopId_documentType_key" ON "ShopDocumentSetting"("shopId", "documentType");

-- CreateIndex
CREATE INDEX "ShopStaff_tenantId_idx" ON "ShopStaff"("tenantId");

-- CreateIndex
CREATE INDEX "ShopStaff_shopId_idx" ON "ShopStaff"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopStaff_userId_shopId_key" ON "ShopStaff"("userId", "shopId");

-- CreateIndex
CREATE UNIQUE INDEX "JobCard_publicToken_key" ON "JobCard"("publicToken");

-- CreateIndex
CREATE INDEX "JobCard_tenantId_idx" ON "JobCard"("tenantId");

-- CreateIndex
CREATE INDEX "JobCard_shopId_idx" ON "JobCard"("shopId");

-- CreateIndex
CREATE INDEX "JobCard_customerId_idx" ON "JobCard"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "JobCard_shopId_jobNumber_key" ON "JobCard"("shopId", "jobNumber");

-- CreateIndex
CREATE UNIQUE INDEX "HSNCode_code_key" ON "HSNCode"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCategory_name_key" ON "ProductCategory"("name");

-- CreateIndex
CREATE INDEX "GlobalProduct_categoryId_idx" ON "GlobalProduct"("categoryId");

-- CreateIndex
CREATE INDEX "GlobalProduct_hsnId_idx" ON "GlobalProduct"("hsnId");

-- CreateIndex
CREATE UNIQUE INDEX "GlobalProduct_name_categoryId_key" ON "GlobalProduct"("name", "categoryId");

-- CreateIndex
CREATE INDEX "ShopProduct_tenantId_idx" ON "ShopProduct"("tenantId");

-- CreateIndex
CREATE INDEX "ShopProduct_shopId_idx" ON "ShopProduct"("shopId");

-- CreateIndex
CREATE INDEX "ShopProduct_globalProductId_idx" ON "ShopProduct"("globalProductId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopProduct_shopId_name_key" ON "ShopProduct"("shopId", "name");

-- CreateIndex
CREATE INDEX "IMEI_tenantId_idx" ON "IMEI"("tenantId");

-- CreateIndex
CREATE INDEX "IMEI_shopProductId_idx" ON "IMEI"("shopProductId");

-- CreateIndex
CREATE INDEX "IMEI_invoiceId_idx" ON "IMEI"("invoiceId");

-- CreateIndex
CREATE INDEX "IMEI_status_idx" ON "IMEI"("status");

-- CreateIndex
CREATE INDEX "IMEI_transferredToShopId_idx" ON "IMEI"("transferredToShopId");

-- CreateIndex
CREATE UNIQUE INDEX "IMEI_tenantId_imei_key" ON "IMEI"("tenantId", "imei");

-- CreateIndex
CREATE INDEX "StockLedger_tenantId_shopId_createdAt_idx" ON "StockLedger"("tenantId", "shopId", "createdAt");

-- CreateIndex
CREATE INDEX "StockLedger_shopProductId_createdAt_idx" ON "StockLedger"("shopProductId", "createdAt");

-- CreateIndex
CREATE INDEX "StockLedger_tenantId_shopId_type_idx" ON "StockLedger"("tenantId", "shopId", "type");

-- CreateIndex
CREATE INDEX "StockLedger_referenceType_referenceId_idx" ON "StockLedger"("referenceType", "referenceId");

-- CreateIndex
CREATE INDEX "StockCorrection_tenantId_shopId_idx" ON "StockCorrection"("tenantId", "shopId");

-- CreateIndex
CREATE INDEX "StockCorrection_shopProductId_idx" ON "StockCorrection"("shopProductId");

-- CreateIndex
CREATE INDEX "StockCorrection_createdAt_idx" ON "StockCorrection"("createdAt");

-- CreateIndex
CREATE INDEX "Invoice_tenantId_idx" ON "Invoice"("tenantId");

-- CreateIndex
CREATE INDEX "Invoice_shopId_idx" ON "Invoice"("shopId");

-- CreateIndex
CREATE INDEX "Invoice_customerId_idx" ON "Invoice"("customerId");

-- CreateIndex
CREATE INDEX "InvoiceItem_invoiceId_idx" ON "InvoiceItem"("invoiceId");

-- CreateIndex
CREATE INDEX "RepairPartUsed_jobCardId_idx" ON "RepairPartUsed"("jobCardId");

-- CreateIndex
CREATE INDEX "RepairPartUsed_shopProductId_idx" ON "RepairPartUsed"("shopProductId");

-- CreateIndex
CREATE UNIQUE INDEX "RepairPartUsed_jobCardId_shopProductId_key" ON "RepairPartUsed"("jobCardId", "shopProductId");

-- CreateIndex
CREATE INDEX "FinancialEntry_tenantId_idx" ON "FinancialEntry"("tenantId");

-- CreateIndex
CREATE INDEX "FinancialEntry_shopId_idx" ON "FinancialEntry"("shopId");

-- CreateIndex
CREATE INDEX "Supplier_tenantId_idx" ON "Supplier"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_tenantId_namelowercase_key" ON "Supplier"("tenantId", "namelowercase");

-- CreateIndex
CREATE INDEX "ShopSupplier_tenantId_idx" ON "ShopSupplier"("tenantId");

-- CreateIndex
CREATE INDEX "ShopSupplier_shopId_idx" ON "ShopSupplier"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopSupplier_shopId_namelowercase_key" ON "ShopSupplier"("shopId", "namelowercase");

-- CreateIndex
CREATE UNIQUE INDEX "GlobalSupplier_namelowercase_key" ON "GlobalSupplier"("namelowercase");

-- CreateIndex
CREATE INDEX "GlobalSupplier_isActive_idx" ON "GlobalSupplier"("isActive");

-- CreateIndex
CREATE INDEX "GlobalSupplier_namelowercase_idx" ON "GlobalSupplier"("namelowercase");

-- CreateIndex
CREATE INDEX "TenantGlobalSupplier_tenantId_idx" ON "TenantGlobalSupplier"("tenantId");

-- CreateIndex
CREATE INDEX "TenantGlobalSupplier_globalSupplierId_idx" ON "TenantGlobalSupplier"("globalSupplierId");

-- CreateIndex
CREATE UNIQUE INDEX "TenantGlobalSupplier_tenantId_globalSupplierId_key" ON "TenantGlobalSupplier"("tenantId", "globalSupplierId");

-- CreateIndex
CREATE INDEX "Purchase_tenantId_idx" ON "Purchase"("tenantId");

-- CreateIndex
CREATE INDEX "Purchase_shopId_idx" ON "Purchase"("shopId");

-- CreateIndex
CREATE INDEX "Purchase_globalSupplierId_idx" ON "Purchase"("globalSupplierId");

-- CreateIndex
CREATE UNIQUE INDEX "Purchase_shopId_invoiceNumber_key" ON "Purchase"("shopId", "invoiceNumber");

-- CreateIndex
CREATE INDEX "PurchaseItem_purchaseId_idx" ON "PurchaseItem"("purchaseId");

-- CreateIndex
CREATE INDEX "PurchaseItem_shopProductId_idx" ON "PurchaseItem"("shopProductId");

-- CreateIndex
CREATE INDEX "SupplierPayment_tenantId_idx" ON "SupplierPayment"("tenantId");

-- CreateIndex
CREATE INDEX "SupplierPayment_shopId_idx" ON "SupplierPayment"("shopId");

-- CreateIndex
CREATE INDEX "SupplierPayment_purchaseId_idx" ON "SupplierPayment"("purchaseId");

-- CreateIndex
CREATE UNIQUE INDEX "Receipt_receiptId_key" ON "Receipt"("receiptId");

-- CreateIndex
CREATE INDEX "Receipt_tenantId_idx" ON "Receipt"("tenantId");

-- CreateIndex
CREATE INDEX "Receipt_shopId_idx" ON "Receipt"("shopId");

-- CreateIndex
CREATE INDEX "Receipt_linkedInvoiceId_idx" ON "Receipt"("linkedInvoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentVoucher_voucherId_key" ON "PaymentVoucher"("voucherId");

-- CreateIndex
CREATE INDEX "PaymentVoucher_tenantId_idx" ON "PaymentVoucher"("tenantId");

-- CreateIndex
CREATE INDEX "PaymentVoucher_shopId_idx" ON "PaymentVoucher"("shopId");

-- CreateIndex
CREATE INDEX "Quotation_tenantId_idx" ON "Quotation"("tenantId");

-- CreateIndex
CREATE INDEX "Quotation_shopId_idx" ON "Quotation"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "Quotation_shopId_quotationNumber_key" ON "Quotation"("shopId", "quotationNumber");

-- CreateIndex
CREATE INDEX "QuotationItem_quotationId_idx" ON "QuotationItem"("quotationId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_tenantId_idx" ON "PurchaseOrder"("tenantId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_shopId_idx" ON "PurchaseOrder"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_shopId_poNumber_key" ON "PurchaseOrder"("shopId", "poNumber");

-- CreateIndex
CREATE INDEX "PurchaseOrderItem_poId_idx" ON "PurchaseOrderItem"("poId");

-- CreateIndex
CREATE INDEX "WhatsAppPhoneNumberModule_moduleType_isActive_idx" ON "WhatsAppPhoneNumberModule"("moduleType", "isActive");

-- CreateIndex
CREATE INDEX "WhatsAppPhoneNumberModule_moduleType_purpose_idx" ON "WhatsAppPhoneNumberModule"("moduleType", "purpose");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppPhoneNumberModule_moduleType_phoneNumberId_key" ON "WhatsAppPhoneNumberModule"("moduleType", "phoneNumberId");

-- AddForeignKey
ALTER TABLE "UserTenant" ADD CONSTRAINT "UserTenant_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTenant" ADD CONSTRAINT "UserTenant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerFollowUp" ADD CONSTRAINT "CustomerFollowUp_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerFollowUp" ADD CONSTRAINT "CustomerFollowUp_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerFollowUp" ADD CONSTRAINT "CustomerFollowUp_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerFollowUp" ADD CONSTRAINT "CustomerFollowUp_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerReminder" ADD CONSTRAINT "CustomerReminder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerReminder" ADD CONSTRAINT "CustomerReminder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyTransaction" ADD CONSTRAINT "LoyaltyTransaction_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyTransaction" ADD CONSTRAINT "LoyaltyTransaction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerAlert" ADD CONSTRAINT "CustomerAlert_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerAlert" ADD CONSTRAINT "CustomerAlert_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerCustomer" ADD CONSTRAINT "LedgerCustomer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerAccount" ADD CONSTRAINT "LedgerAccount_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "LedgerCustomer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerAccount" ADD CONSTRAINT "LedgerAccount_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerCollection" ADD CONSTRAINT "LedgerCollection_ledgerId_fkey" FOREIGN KEY ("ledgerId") REFERENCES "LedgerAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberPayment" ADD CONSTRAINT "MemberPayment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanFeature" ADD CONSTRAINT "PlanFeature_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantSubscription" ADD CONSTRAINT "TenantSubscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantSubscription" ADD CONSTRAINT "TenantSubscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformAuditLog" ADD CONSTRAINT "PlatformAuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymMembership" ADD CONSTRAINT "GymMembership_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymAttendance" ADD CONSTRAINT "GymAttendance_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shop" ADD CONSTRAINT "Shop_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopDocumentSetting" ADD CONSTRAINT "ShopDocumentSetting_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopStaff" ADD CONSTRAINT "ShopStaff_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopStaff" ADD CONSTRAINT "ShopStaff_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopStaff" ADD CONSTRAINT "ShopStaff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobCard" ADD CONSTRAINT "JobCard_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobCard" ADD CONSTRAINT "JobCard_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobCard" ADD CONSTRAINT "JobCard_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GlobalProduct" ADD CONSTRAINT "GlobalProduct_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProductCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GlobalProduct" ADD CONSTRAINT "GlobalProduct_hsnId_fkey" FOREIGN KEY ("hsnId") REFERENCES "HSNCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopProduct" ADD CONSTRAINT "ShopProduct_globalProductId_fkey" FOREIGN KEY ("globalProductId") REFERENCES "GlobalProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopProduct" ADD CONSTRAINT "ShopProduct_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopProduct" ADD CONSTRAINT "ShopProduct_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IMEI" ADD CONSTRAINT "IMEI_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IMEI" ADD CONSTRAINT "IMEI_shopProductId_fkey" FOREIGN KEY ("shopProductId") REFERENCES "ShopProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IMEI" ADD CONSTRAINT "IMEI_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IMEI" ADD CONSTRAINT "IMEI_transferredToShopId_fkey" FOREIGN KEY ("transferredToShopId") REFERENCES "Shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLedger" ADD CONSTRAINT "StockLedger_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLedger" ADD CONSTRAINT "StockLedger_shopProductId_fkey" FOREIGN KEY ("shopProductId") REFERENCES "ShopProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLedger" ADD CONSTRAINT "StockLedger_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockCorrection" ADD CONSTRAINT "StockCorrection_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockCorrection" ADD CONSTRAINT "StockCorrection_shopProductId_fkey" FOREIGN KEY ("shopProductId") REFERENCES "ShopProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockCorrection" ADD CONSTRAINT "StockCorrection_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_shopProductId_fkey" FOREIGN KEY ("shopProductId") REFERENCES "ShopProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairPartUsed" ADD CONSTRAINT "RepairPartUsed_jobCardId_fkey" FOREIGN KEY ("jobCardId") REFERENCES "JobCard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairPartUsed" ADD CONSTRAINT "RepairPartUsed_shopProductId_fkey" FOREIGN KEY ("shopProductId") REFERENCES "ShopProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialEntry" ADD CONSTRAINT "FinancialEntry_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialEntry" ADD CONSTRAINT "FinancialEntry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopSupplier" ADD CONSTRAINT "ShopSupplier_globalSupplierId_fkey" FOREIGN KEY ("globalSupplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantGlobalSupplier" ADD CONSTRAINT "TenantGlobalSupplier_globalSupplierId_fkey" FOREIGN KEY ("globalSupplierId") REFERENCES "GlobalSupplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantGlobalSupplier" ADD CONSTRAINT "TenantGlobalSupplier_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_globalSupplierId_fkey" FOREIGN KEY ("globalSupplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseItem" ADD CONSTRAINT "PurchaseItem_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseItem" ADD CONSTRAINT "PurchaseItem_shopProductId_fkey" FOREIGN KEY ("shopProductId") REFERENCES "ShopProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_linkedInvoiceId_fkey" FOREIGN KEY ("linkedInvoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentVoucher" ADD CONSTRAINT "PaymentVoucher_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentVoucher" ADD CONSTRAINT "PaymentVoucher_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationItem" ADD CONSTRAINT "QuotationItem_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_poId_fkey" FOREIGN KEY ("poId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
