CREATE TABLE IF NOT EXISTS "mb_device_model_request" (
  "id"          TEXT NOT NULL,
  "rawInput"    TEXT NOT NULL,
  "parsedBrand" TEXT NOT NULL,
  "parsedModel" TEXT NOT NULL,
  "tenantId"    TEXT NOT NULL,
  "requestedBy" TEXT NOT NULL,
  "status"      TEXT NOT NULL DEFAULT 'PENDING',
  "count"       INTEGER NOT NULL DEFAULT 1,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt"  TIMESTAMP(3),
  "resolvedBy"  TEXT,

  CONSTRAINT "mb_device_model_request_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "mb_device_model_request_status_idx"
  ON "mb_device_model_request"("status");

CREATE INDEX IF NOT EXISTS "mb_device_model_request_brand_model_idx"
  ON "mb_device_model_request"("parsedBrand", "parsedModel");
