-- AlterTable
ALTER TABLE "WhatsAppBotConfig" ADD COLUMN     "aiReplyEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "menuBotEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "WhatsAppConversationState" ADD COLUMN     "currentMenuNodeId" TEXT,
ADD COLUMN     "menuEnteredAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "WhatsAppMenuItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "parentId" TEXT,
    "triggerKey" TEXT NOT NULL,
    "menuLabel" TEXT NOT NULL,
    "replyText" TEXT,
    "replyMode" TEXT NOT NULL DEFAULT 'STATIC',
    "aiSystemPrompt" TEXT,
    "fallbackReply" TEXT,
    "isLeaf" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppMenuItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WhatsAppMenuItem_tenantId_idx" ON "WhatsAppMenuItem"("tenantId");

-- CreateIndex
CREATE INDEX "WhatsAppMenuItem_tenantId_parentId_idx" ON "WhatsAppMenuItem"("tenantId", "parentId");

-- AddForeignKey
ALTER TABLE "WhatsAppMenuItem" ADD CONSTRAINT "WhatsAppMenuItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppMenuItem" ADD CONSTRAINT "WhatsAppMenuItem_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "WhatsAppMenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
