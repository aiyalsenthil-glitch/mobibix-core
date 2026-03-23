-- Migration: Add Meta-specific fields to WhatsAppPhoneNumber
-- metaUserId: FB user_id who connected the WABA — needed for Data Deletion Callback
-- tokenExpiresAt: expiry for short-lived user tokens; NULL = system user token (no expiry)

ALTER TABLE "WhatsAppPhoneNumber"
  ADD COLUMN IF NOT EXISTS "metaUserId"     TEXT,
  ADD COLUMN IF NOT EXISTS "tokenExpiresAt" TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS "WhatsAppPhoneNumber_metaUserId_idx" ON "WhatsAppPhoneNumber"("metaUserId")
  WHERE "metaUserId" IS NOT NULL;
