-- Add pincode and distanceFromShop to mb_party (for E-Way Bill auto distance)
ALTER TABLE "mb_party"
  ADD COLUMN IF NOT EXISTS "pincode" TEXT,
  ADD COLUMN IF NOT EXISTS "distanceFromShop" INTEGER;
