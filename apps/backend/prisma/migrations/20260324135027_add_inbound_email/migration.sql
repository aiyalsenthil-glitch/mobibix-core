-- CreateEnum
CREATE TYPE "InboundEmailStatus" AS ENUM ('RECEIVED', 'READ', 'REPLIED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "mb_inbound_email" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "fromAddress" TEXT NOT NULL,
    "fromName" TEXT,
    "toAddress" TEXT NOT NULL,
    "subject" TEXT,
    "bodyHtml" TEXT,
    "bodyText" TEXT,
    "resendMessageId" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "status" "InboundEmailStatus" NOT NULL DEFAULT 'RECEIVED',

    CONSTRAINT "mb_inbound_email_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mb_inbound_email_resendMessageId_key" ON "mb_inbound_email"("resendMessageId");

-- CreateIndex
CREATE INDEX "mb_inbound_email_tenantId_idx" ON "mb_inbound_email"("tenantId");

-- CreateIndex
CREATE INDEX "mb_inbound_email_fromAddress_idx" ON "mb_inbound_email"("fromAddress");

-- CreateIndex
CREATE INDEX "mb_inbound_email_receivedAt_idx" ON "mb_inbound_email"("receivedAt");

-- AddForeignKey
ALTER TABLE "mb_inbound_email" ADD CONSTRAINT "mb_inbound_email_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
