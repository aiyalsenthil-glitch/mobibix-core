-- AlterTable
ALTER TABLE "WhatsAppMessageLog" ADD COLUMN "jid" TEXT;

-- CreateIndex
CREATE INDEX "WhatsAppMessageLog_jid_idx" ON "WhatsAppMessageLog"("jid");
