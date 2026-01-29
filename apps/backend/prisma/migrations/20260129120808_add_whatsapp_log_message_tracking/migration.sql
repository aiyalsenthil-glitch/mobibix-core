-- AlterTable
ALTER TABLE "WhatsAppLog" ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ADD COLUMN     "messageId" TEXT,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "readAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "WhatsAppLog_tenantId_status_idx" ON "WhatsAppLog"("tenantId", "status");

-- CreateIndex
CREATE INDEX "WhatsAppLog_messageId_idx" ON "WhatsAppLog"("messageId");
