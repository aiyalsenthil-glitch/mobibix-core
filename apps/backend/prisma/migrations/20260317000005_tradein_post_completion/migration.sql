-- Alter mb_trade_in: add post-completion tracking columns
ALTER TABLE "mb_trade_in" ADD COLUMN IF NOT EXISTS "postCompletionAction" TEXT;
ALTER TABLE "mb_trade_in" ADD COLUMN IF NOT EXISTS "inventoryProductId" TEXT;
ALTER TABLE "mb_trade_in" ADD COLUMN IF NOT EXISTS "creditVoucherId" TEXT;

-- Create TradeInVoucherStatus enum
DO $$ BEGIN
  CREATE TYPE "TradeInVoucherStatus" AS ENUM ('ACTIVE', 'REDEEMED', 'EXPIRED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create mb_tradein_voucher table
CREATE TABLE IF NOT EXISTS "mb_tradein_voucher" (
  "id"                  TEXT NOT NULL,
  "tenantId"            TEXT NOT NULL,
  "shopId"              TEXT NOT NULL,
  "voucherCode"         TEXT NOT NULL,
  "tradeInId"           TEXT NOT NULL,
  "customerId"          TEXT,
  "customerName"        TEXT NOT NULL,
  "customerPhone"       TEXT NOT NULL,
  "amount"              INTEGER NOT NULL,
  "status"              "TradeInVoucherStatus" NOT NULL DEFAULT 'ACTIVE',
  "expiresAt"           TIMESTAMP(3) NOT NULL,
  "redeemedAt"          TIMESTAMP(3),
  "redeemedByInvoiceId" TEXT,
  "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdBy"           TEXT NOT NULL,

  CONSTRAINT "mb_tradein_voucher_pkey" PRIMARY KEY ("id")
);

-- Unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS "mb_tradein_voucher_voucherCode_key"
  ON "mb_tradein_voucher"("voucherCode");

CREATE UNIQUE INDEX IF NOT EXISTS "mb_tradein_voucher_tradeInId_key"
  ON "mb_tradein_voucher"("tradeInId");

-- Lookup indexes
CREATE INDEX IF NOT EXISTS "mb_tradein_voucher_tenantId_status_idx"
  ON "mb_tradein_voucher"("tenantId", "status");

CREATE INDEX IF NOT EXISTS "mb_tradein_voucher_customerId_idx"
  ON "mb_tradein_voucher"("customerId");

CREATE INDEX IF NOT EXISTS "mb_tradein_voucher_voucherCode_idx"
  ON "mb_tradein_voucher"("voucherCode");
