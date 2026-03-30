-- Add REMOVED_TOKENWid to WhatsAppTemplate
-- Stores the Authkey numeric template ID (wid) separate from metaTemplateName
-- Safe: nullable column, no data loss

ALTER TABLE "WhatsAppTemplate"
  ADD COLUMN IF NOT EXISTS "REMOVED_TOKENWid" TEXT;
