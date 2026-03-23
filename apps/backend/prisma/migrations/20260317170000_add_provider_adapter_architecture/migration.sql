-- Migration: Provider Adapter Architecture
-- Adds AUTHKEY enum value, MessageChannel enum, Authkey credential fields,
-- and cost/channel tracking fields on WhatsAppLog.

-- 1. Add AUTHKEY to WhatsAppProviderType enum
ALTER TYPE "WhatsAppProviderType" ADD VALUE IF NOT EXISTS 'AUTHKEY';

-- 2. Create MessageChannel enum
DO $$ BEGIN
  CREATE TYPE "MessageChannel" AS ENUM ('WHATSAPP', 'SMS', 'EMAIL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Add Authkey credential fields to WhatsAppPhoneNumber
ALTER TABLE "WhatsAppPhoneNumber"
  ADD COLUMN IF NOT EXISTS "REMOVED_TOKENApiKey"   TEXT,
  ADD COLUMN IF NOT EXISTS "REMOVED_TOKENSenderId" TEXT;

-- 4. Add cost tracking + channel fields to WhatsAppLog
ALTER TABLE "WhatsAppLog"
  ADD COLUMN IF NOT EXISTS "channel"      "MessageChannel" NOT NULL DEFAULT 'WHATSAPP',
  ADD COLUMN IF NOT EXISTS "providerUsed" TEXT,
  ADD COLUMN IF NOT EXISTS "messageCost"  DOUBLE PRECISION;

-- 5. Performance indexes
CREATE INDEX IF NOT EXISTS "WhatsAppLog_channel_idx"      ON "WhatsAppLog"("channel");
CREATE INDEX IF NOT EXISTS "WhatsAppLog_providerUsed_idx" ON "WhatsAppLog"("providerUsed");
