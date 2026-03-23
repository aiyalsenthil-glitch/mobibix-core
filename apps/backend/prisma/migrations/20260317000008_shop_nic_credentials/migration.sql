-- Add per-shop NIC e-waybill credentials to mb_shop
ALTER TABLE "mb_shop"
  ADD COLUMN IF NOT EXISTS "nicUsername" TEXT,
  ADD COLUMN IF NOT EXISTS "nicPassword" TEXT;
