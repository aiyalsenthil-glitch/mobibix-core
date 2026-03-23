-- Add cash payout fields to mb_trade_in
ALTER TABLE "mb_trade_in"
  ADD COLUMN IF NOT EXISTS "payoutMode" TEXT,
  ADD COLUMN IF NOT EXISTS "payoutAt"   TIMESTAMPTZ;
