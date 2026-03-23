-- Migration: consumer_finance_tradein_intel
-- Date: 2026-03-17
-- Features:
--   1. Extend PaymentMode enum with NBFC_EMI, SHOP_EMI, CARD_EMI
--   2. Add tradeInId + tradeInCredit to Invoice
--   3. EMI Application table (Bajaj/NBFC type)
--   4. Installment Plan + Slot tables (shop-owned EMI / Kistikatta)
--   5. New enums: EmiStatus, InstallmentStatus, SlotStatus

-- ─── 1. Extend PaymentMode enum ──────────────────────────────────────────────
ALTER TYPE "PaymentMode" ADD VALUE IF NOT EXISTS 'CARD_EMI';
ALTER TYPE "PaymentMode" ADD VALUE IF NOT EXISTS 'NBFC_EMI';
ALTER TYPE "PaymentMode" ADD VALUE IF NOT EXISTS 'SHOP_EMI';

-- ─── 2. Trade-in fields on Invoice ───────────────────────────────────────────
ALTER TABLE "mb_invoice" ADD COLUMN IF NOT EXISTS "tradeInId"     TEXT;
ALTER TABLE "mb_invoice" ADD COLUMN IF NOT EXISTS "tradeInCredit" INTEGER NOT NULL DEFAULT 0;

-- ─── 3. EMI Status Enum ───────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "EmiStatus" AS ENUM ('APPLIED', 'APPROVED', 'SETTLED', 'REJECTED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 4. Installment Status Enums ──────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "InstallmentStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'DEFAULTED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "SlotStatus" AS ENUM ('PENDING', 'PAID', 'PARTIALLY_PAID', 'OVERDUE', 'WAIVED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 5. EMI Application table (NBFC / Bajaj Finserv) ─────────────────────────
CREATE TABLE IF NOT EXISTS "mb_emi_application" (
  "id"               TEXT NOT NULL,
  "tenantId"         TEXT NOT NULL,
  "shopId"           TEXT NOT NULL,
  "invoiceId"        TEXT NOT NULL,
  "customerId"       TEXT,
  "emiNumber"        TEXT NOT NULL,
  "financeProvider"  TEXT NOT NULL,
  "applicationRef"   TEXT,
  "loanAmount"       INTEGER NOT NULL,
  "downPayment"      INTEGER NOT NULL DEFAULT 0,
  "tenureMonths"     INTEGER NOT NULL,
  "monthlyEmi"       INTEGER NOT NULL,
  "interestRate"     DECIMAL,
  "subventionAmount" INTEGER NOT NULL DEFAULT 0,
  "status"           "EmiStatus" NOT NULL DEFAULT 'APPLIED',
  "settlementAmount" INTEGER,
  "settledAt"        TIMESTAMP(3),
  "rejectedReason"   TEXT,
  "notes"            TEXT,
  "createdBy"        TEXT NOT NULL,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "mb_emi_application_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "mb_emi_application_invoiceId_key" UNIQUE ("invoiceId"),
  CONSTRAINT "mb_emi_application_shopId_fkey"  FOREIGN KEY ("shopId")   REFERENCES "mb_shop"("id")   ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "mb_emi_application_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")   ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "mb_emi_application_tenantId_shopId_status_idx" ON "mb_emi_application"("tenantId","shopId","status");
CREATE INDEX IF NOT EXISTS "mb_emi_application_invoiceId_idx"              ON "mb_emi_application"("invoiceId");

-- ─── 6. Installment Plan table (Shop-owned "Kistikatta") ──────────────────────
CREATE TABLE IF NOT EXISTS "mb_installment_plan" (
  "id"              TEXT NOT NULL,
  "tenantId"        TEXT NOT NULL,
  "shopId"          TEXT NOT NULL,
  "invoiceId"       TEXT NOT NULL,
  "customerId"      TEXT NOT NULL,
  "planNumber"      TEXT NOT NULL,
  "totalAmount"     INTEGER NOT NULL,
  "downPayment"     INTEGER NOT NULL DEFAULT 0,
  "remainingAmount" INTEGER NOT NULL,
  "tenureMonths"    INTEGER NOT NULL,
  "monthlyAmount"   INTEGER NOT NULL,
  "startDate"       TIMESTAMP(3) NOT NULL,
  "notes"           TEXT,
  "status"          "InstallmentStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdBy"       TEXT NOT NULL,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "mb_installment_plan_pkey"              PRIMARY KEY ("id"),
  CONSTRAINT "mb_installment_plan_invoiceId_key"     UNIQUE ("invoiceId"),
  CONSTRAINT "mb_installment_plan_shopId_planNumber" UNIQUE ("shopId","planNumber"),
  CONSTRAINT "mb_installment_plan_shopId_fkey"   FOREIGN KEY ("shopId")   REFERENCES "mb_shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "mb_installment_plan_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "mb_installment_plan_tenantId_shopId_status_idx" ON "mb_installment_plan"("tenantId","shopId","status");
CREATE INDEX IF NOT EXISTS "mb_installment_plan_customerId_idx"             ON "mb_installment_plan"("customerId");

-- ─── 7. Installment Slot table (individual due dates) ─────────────────────────
CREATE TABLE IF NOT EXISTS "mb_installment_slot" (
  "id"             TEXT NOT NULL,
  "planId"         TEXT NOT NULL,
  "tenantId"       TEXT NOT NULL,
  "slotNumber"     INTEGER NOT NULL,
  "dueDate"        TIMESTAMP(3) NOT NULL,
  "amount"         INTEGER NOT NULL,
  "paidAmount"     INTEGER NOT NULL DEFAULT 0,
  "paidAt"         TIMESTAMP(3),
  "receiptId"      TEXT,
  "status"         "SlotStatus" NOT NULL DEFAULT 'PENDING',
  "reminderSentAt" TIMESTAMP(3),
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "mb_installment_slot_pkey"   PRIMARY KEY ("id"),
  CONSTRAINT "mb_installment_slot_planId_fkey" FOREIGN KEY ("planId") REFERENCES "mb_installment_plan"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "mb_installment_slot_planId_idx"              ON "mb_installment_slot"("planId");
CREATE INDEX IF NOT EXISTS "mb_installment_slot_tenantId_dueDate_idx"    ON "mb_installment_slot"("tenantId","dueDate");
CREATE INDEX IF NOT EXISTS "mb_installment_slot_tenantId_status_idx"     ON "mb_installment_slot"("tenantId","status");
