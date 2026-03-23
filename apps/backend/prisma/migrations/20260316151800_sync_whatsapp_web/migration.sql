-- CreateEnum
CREATE TYPE "WhatsAppProviderType" AS ENUM ('META_CLOUD', 'WEB_SOCKET');

-- AlterEnum
ALTER TYPE "WhatsAppSetupStatus" ADD VALUE 'SCAN_REQUIRED';

-- AlterTable
ALTER TABLE "WhatsAppPhoneNumber" ADD COLUMN     "provider" "WhatsAppProviderType" NOT NULL DEFAULT 'META_CLOUD',
ADD COLUMN     "shardId" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "webSessionData" TEXT,
ADD COLUMN     "webSessionId" TEXT;

-- CreateTable
CREATE TABLE "WhatsAppConversationState" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "step" TEXT NOT NULL,
    "metadata" JSONB,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppConversationState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppMessageLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "provider" "WhatsAppProviderType" NOT NULL,
    "whatsAppNumberId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppMessageLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WhatsAppConversationState_tenantId_idx" ON "WhatsAppConversationState"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppConversationState_tenantId_phoneNumber_key" ON "WhatsAppConversationState"("tenantId", "phoneNumber");

-- CreateIndex
CREATE INDEX "WhatsAppMessageLog_tenantId_idx" ON "WhatsAppMessageLog"("tenantId");

-- CreateIndex
CREATE INDEX "WhatsAppMessageLog_phoneNumber_idx" ON "WhatsAppMessageLog"("phoneNumber");

-- CreateIndex
CREATE INDEX "WhatsAppMessageLog_provider_idx" ON "WhatsAppMessageLog"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppPhoneNumber_webSessionId_key" ON "WhatsAppPhoneNumber"("webSessionId");

-- CreateIndex
CREATE INDEX "WhatsAppPhoneNumber_phoneNumber_idx" ON "WhatsAppPhoneNumber"("phoneNumber");

-- CreateIndex
CREATE INDEX "WhatsAppPhoneNumber_provider_idx" ON "WhatsAppPhoneNumber"("provider");

-- AddForeignKey
ALTER TABLE "WhatsAppConversationState" ADD CONSTRAINT "WhatsAppConversationState_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppMessageLog" ADD CONSTRAINT "WhatsAppMessageLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppMessageLog" ADD CONSTRAINT "WhatsAppMessageLog_whatsAppNumberId_fkey" FOREIGN KEY ("whatsAppNumberId") REFERENCES "WhatsAppPhoneNumber"("id") ON DELETE SET NULL ON UPDATE CASCADE;
