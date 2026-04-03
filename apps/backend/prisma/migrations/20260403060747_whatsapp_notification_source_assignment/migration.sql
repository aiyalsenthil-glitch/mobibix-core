-- AlterTable
ALTER TABLE "WhatsAppBotConfig" ADD COLUMN     "notificationSource" TEXT NOT NULL DEFAULT 'PLATFORM';

-- AlterTable
ALTER TABLE "WhatsAppConversationState" ADD COLUMN     "assignedToUserId" TEXT,
ADD COLUMN     "lastReadAt" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "WhatsAppConversationState" ADD CONSTRAINT "WhatsAppConversationState_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
