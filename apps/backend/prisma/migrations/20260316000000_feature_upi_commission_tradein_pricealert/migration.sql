-- Migration: feature_upi_commission_tradein_pricealert
-- Date: 2026-03-16
-- Features: UPI QR, Staff Commission, Trade-in/Buyback, Supplier Price Drop Protection

-- ─── F1: UPI QR — Add upiId to Shop ──────────────────────────────────────────
ALTER TABLE "mb_shop" ADD COLUMN IF NOT EXISTS "upiId" TEXT;

-- ─── F5: Price Drop — Add lastPurchaseSupplierId to ShopProduct ──────────────
ALTER TABLE "mb_shop_product" ADD COLUMN IF NOT EXISTS "lastPurchaseSupplierId" TEXT;

-- ─── F3: Staff Commission — Enums ────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "CommissionScope" AS ENUM ('ALL_STAFF', 'SPECIFIC_STAFF', 'SPECIFIC_ROLE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CommissionType" AS ENUM ('PERCENTAGE_OF_SALE', 'PERCENTAGE_OF_PROFIT', 'FIXED_PER_ITEM');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "EarningStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── F3: Staff Commission — Tables ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "mb_commission_rule" (
  "id"        TEXT NOT NULL,
  "tenantId"  TEXT NOT NULL,
  "shopId"    TEXT NOT NULL,
  "name"      TEXT NOT NULL,
  "applyTo"   "CommissionScope" NOT NULL DEFAULT 'ALL_STAFF',
  "staffId"   TEXT,
  "staffRole" "UserRole",
  "category"  TEXT,
  "type"      "CommissionType" NOT NULL,
  "value"     DECIMAL NOT NULL,
  "isActive"  BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "mb_commission_rule_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "mb_commission_rule_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "mb_shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "mb_commission_rule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "mb_commission_rule_tenantId_shopId_idx" ON "mb_commission_rule"("tenantId", "shopId");

CREATE TABLE IF NOT EXISTS "mb_staff_earning" (
  "id"           TEXT NOT NULL,
  "tenantId"     TEXT NOT NULL,
  "shopId"       TEXT NOT NULL,
  "staffId"      TEXT NOT NULL,
  "invoiceId"    TEXT NOT NULL,
  "ruleId"       TEXT NOT NULL,
  "saleAmount"   INTEGER NOT NULL,
  "profitAmount" INTEGER,
  "earned"       INTEGER NOT NULL,
  "status"       "EarningStatus" NOT NULL DEFAULT 'PENDING',
  "paidAt"       TIMESTAMP(3),
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "mb_staff_earning_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "mb_staff_earning_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "mb_commission_rule"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "mb_staff_earning_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "mb_shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "mb_staff_earning_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "mb_staff_earning_tenantId_shopId_staffId_idx" ON "mb_staff_earning"("tenantId", "shopId", "staffId");
CREATE INDEX IF NOT EXISTS "mb_staff_earning_invoiceId_idx" ON "mb_staff_earning"("invoiceId");

-- ─── F4: Trade-in Buyback — Enums ────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "TradeInGrade" AS ENUM ('EXCELLENT', 'GOOD', 'FAIR', 'POOR');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "TradeInStatus" AS ENUM ('DRAFT', 'OFFERED', 'ACCEPTED', 'REJECTED', 'COMPLETED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── F4: Trade-in Buyback — Table ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "mb_trade_in" (
  "id"              TEXT NOT NULL,
  "tenantId"        TEXT NOT NULL,
  "shopId"          TEXT NOT NULL,
  "tradeInNumber"   TEXT NOT NULL,
  "customerId"      TEXT,
  "customerName"    TEXT NOT NULL,
  "customerPhone"   TEXT NOT NULL,
  "deviceBrand"     TEXT NOT NULL,
  "deviceModel"     TEXT NOT NULL,
  "deviceImei"      TEXT,
  "deviceStorage"   TEXT,
  "deviceColor"     TEXT,
  "conditionChecks" JSONB NOT NULL DEFAULT '{}',
  "conditionGrade"  "TradeInGrade" NOT NULL DEFAULT 'FAIR',
  "marketValue"     INTEGER NOT NULL DEFAULT 0,
  "offeredValue"    INTEGER NOT NULL DEFAULT 0,
  "status"          "TradeInStatus" NOT NULL DEFAULT 'DRAFT',
  "linkedInvoiceId" TEXT,
  "notes"           TEXT,
  "createdBy"       TEXT NOT NULL,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "mb_trade_in_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "mb_trade_in_shopId_tradeInNumber_key" UNIQUE ("shopId", "tradeInNumber"),
  CONSTRAINT "mb_trade_in_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "mb_party"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "mb_trade_in_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "mb_shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "mb_trade_in_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "mb_trade_in_tenantId_shopId_idx" ON "mb_trade_in"("tenantId", "shopId");

-- ─── F5: Price Drop Protection — Enum + Table ────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "PriceAlertStatus" AS ENUM ('PENDING', 'CLAIMED', 'DISMISSED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "mb_supplier_price_alert" (
  "id"                 TEXT NOT NULL,
  "tenantId"           TEXT NOT NULL,
  "shopId"             TEXT NOT NULL,
  "shopProductId"      TEXT NOT NULL,
  "supplierId"         TEXT NOT NULL,
  "affectedPurchaseId" TEXT NOT NULL,
  "newGrnId"           TEXT NOT NULL,
  "previousPrice"      INTEGER NOT NULL,
  "newPrice"           INTEGER NOT NULL,
  "priceDrop"          INTEGER NOT NULL,
  "quantityAtRisk"     INTEGER NOT NULL,
  "potentialCredit"    INTEGER NOT NULL,
  "status"             "PriceAlertStatus" NOT NULL DEFAULT 'PENDING',
  "creditNoteId"       TEXT,
  "dismissedAt"        TIMESTAMP(3),
  "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "mb_supplier_price_alert_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "mb_supplier_price_alert_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "mb_shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "mb_supplier_price_alert_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "mb_supplier_price_alert_shopProductId_fkey" FOREIGN KEY ("shopProductId") REFERENCES "mb_shop_product"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "mb_supplier_price_alert_tenantId_shopId_status_idx" ON "mb_supplier_price_alert"("tenantId", "shopId", "status");
