-- Market price intelligence table for trade-in valuation
-- Stores scraped baseline prices (Cashify) + crowd-sourced data from real trade-ins

CREATE TABLE IF NOT EXISTS "mb_market_price_intel" (
  "id"             TEXT NOT NULL,
  "brand"          TEXT NOT NULL,
  "model"          TEXT NOT NULL,
  "storage"        TEXT,
  "avgMarketValue" INTEGER NOT NULL,
  "minMarketValue" INTEGER,
  "maxMarketValue" INTEGER,
  "avgOffer"       INTEGER,
  "sampleCount"    INTEGER NOT NULL DEFAULT 1,
  "dataSource"     TEXT NOT NULL DEFAULT 'CASHIFY',
  "lastUpdated"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "mb_market_price_intel_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "mb_market_price_intel_brand_model_storage_key"
  ON "mb_market_price_intel"("brand", "model", "storage");

CREATE INDEX IF NOT EXISTS "mb_market_price_intel_brand_model_idx"
  ON "mb_market_price_intel"("brand", "model");
