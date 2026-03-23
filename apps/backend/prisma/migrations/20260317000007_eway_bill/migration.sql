-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "EWayBillStatus" AS ENUM ('DRAFT', 'GENERATING', 'GENERATED', 'FAILED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable: mb_eway_bill
CREATE TABLE IF NOT EXISTS "mb_eway_bill" (
  "id"              TEXT NOT NULL,
  "tenantId"        TEXT NOT NULL,
  "shopId"          TEXT NOT NULL,
  "invoiceId"       TEXT NOT NULL,
  "ewbNumber"       TEXT,
  "ewbDate"         TIMESTAMPTZ,
  "validUpto"       TIMESTAMPTZ,
  "transMode"       TEXT NOT NULL DEFAULT 'ROAD',
  "vehicleNumber"   TEXT,
  "transporterId"   TEXT,
  "transporterName" TEXT,
  "distance"        INTEGER,
  "nicRequestId"    TEXT,
  "requestPayload"  JSONB,
  "rawResponse"     JSONB,
  "status"          "EWayBillStatus" NOT NULL DEFAULT 'DRAFT',
  "cancelReason"    TEXT,
  "generatedAt"     TIMESTAMPTZ,
  "cancelledAt"     TIMESTAMPTZ,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "createdBy"       TEXT,

  CONSTRAINT "mb_eway_bill_pkey"             PRIMARY KEY ("id"),
  CONSTRAINT "mb_eway_bill_invoiceId_key"    UNIQUE ("invoiceId"),
  CONSTRAINT "mb_eway_bill_ewbNumber_key"    UNIQUE ("ewbNumber"),
  CONSTRAINT "mb_eway_bill_nicRequestId_key" UNIQUE ("nicRequestId"),

  CONSTRAINT "mb_eway_bill_invoiceId_fkey"
    FOREIGN KEY ("invoiceId") REFERENCES "mb_invoice"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "mb_eway_bill_shopId_fkey"
    FOREIGN KEY ("shopId") REFERENCES "mb_shop"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "mb_eway_bill_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "mb_eway_bill_tenantId_shopId_idx"
  ON "mb_eway_bill"("tenantId", "shopId");

CREATE INDEX IF NOT EXISTS "mb_eway_bill_tenantId_status_idx"
  ON "mb_eway_bill"("tenantId", "status");
