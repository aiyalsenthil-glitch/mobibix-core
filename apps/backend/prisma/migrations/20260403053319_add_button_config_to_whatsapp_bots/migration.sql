-- AlterTable
ALTER TABLE "WhatsAppAutoReply" ADD COLUMN     "buttonConfig" JSONB,
ADD COLUMN     "buttonType" TEXT;

-- AlterTable
ALTER TABLE "WhatsAppMenuItem" ADD COLUMN     "buttonConfig" JSONB,
ADD COLUMN     "buttonType" TEXT;
