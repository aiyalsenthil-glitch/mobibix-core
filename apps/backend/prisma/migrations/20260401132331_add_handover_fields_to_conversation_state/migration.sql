-- AlterTable
ALTER TABLE "WhatsAppConversationState" ADD COLUMN     "agentActiveAt" TIMESTAMP(3),
ADD COLUMN     "botPaused" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "WhatsAppConversationState_botPaused_agentActiveAt_idx" ON "WhatsAppConversationState"("botPaused", "agentActiveAt");
