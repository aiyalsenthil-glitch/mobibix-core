-- WhatsApp Campaign Engine Migration
-- Adds: campaign fields, per-recipient logs, Authkey number fields

-- AlterTable: WhatsAppNumber — Authkey connection tracking
ALTER TABLE "WhatsAppNumber"
  ADD COLUMN IF NOT EXISTS "REMOVED_TOKENCountryCode" TEXT DEFAULT '91',
  ADD COLUMN IF NOT EXISTS "REMOVED_TOKENVerifiedAt"  TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastTestSentAt"     TIMESTAMP(3);

-- AlterTable: WhatsAppCampaign — full campaign engine fields
ALTER TABLE "WhatsAppCampaign"
  ADD COLUMN IF NOT EXISTS "wid"              TEXT,
  ADD COLUMN IF NOT EXISTS "completedAt"      TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "cancelledAt"      TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "recipients"       JSONB,
  ADD COLUMN IF NOT EXISTS "variables"        JSONB,
  ADD COLUMN IF NOT EXISTS "countryCode"      TEXT NOT NULL DEFAULT '91',
  ADD COLUMN IF NOT EXISTS "batchSize"        INTEGER NOT NULL DEFAULT 200,
  ADD COLUMN IF NOT EXISTS "batchDelayMs"     INTEGER NOT NULL DEFAULT 1500,
  ADD COLUMN IF NOT EXISTS "sentCount"        INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "failedCount"      INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "totalCount"       INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "whatsAppNumberId" TEXT,
  ADD COLUMN IF NOT EXISTS "errorSummary"     TEXT;

-- FK: WhatsAppCampaign → WhatsAppNumber
ALTER TABLE "WhatsAppCampaign"
  ADD CONSTRAINT "WhatsAppCampaign_whatsAppNumberId_fkey"
  FOREIGN KEY ("whatsAppNumberId") REFERENCES "WhatsAppNumber"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: WhatsAppCampaignLog (per-recipient send results)
CREATE TABLE IF NOT EXISTS "WhatsAppCampaignLog" (
  "id"          TEXT NOT NULL DEFAULT gen_random_uuid(),
  "campaignId"  TEXT NOT NULL,
  "tenantId"    TEXT NOT NULL,
  "phone"       TEXT NOT NULL,
  "contactName" TEXT,
  "status"      TEXT NOT NULL DEFAULT 'PENDING',
  "errorMessage" TEXT,
  "providerRef" TEXT,
  "sentAt"      TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "WhatsAppCampaignLog_pkey" PRIMARY KEY ("id")
);

-- FK: WhatsAppCampaignLog → WhatsAppCampaign
ALTER TABLE "WhatsAppCampaignLog"
  ADD CONSTRAINT "WhatsAppCampaignLog_campaignId_fkey"
  FOREIGN KEY ("campaignId") REFERENCES "WhatsAppCampaign"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Indexes
CREATE INDEX IF NOT EXISTS "WhatsAppCampaignLog_campaignId_idx" ON "WhatsAppCampaignLog"("campaignId");
CREATE INDEX IF NOT EXISTS "WhatsAppCampaignLog_tenantId_status_idx" ON "WhatsAppCampaignLog"("tenantId", "status");
