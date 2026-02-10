-- CreateEnum
CREATE TYPE "WhatsAppSetupStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'ACTIVE', 'FAILED', 'DISCONNECTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "WhatsAppFeature" ADD VALUE 'WHATSAPP_TEAM_INBOX';
ALTER TYPE "WhatsAppFeature" ADD VALUE 'WHATSAPP_WEBHOOKS';
ALTER TYPE "WhatsAppFeature" ADD VALUE 'WHATSAPP_API_ACCESS';

-- AlterTable
ALTER TABLE "WhatsAppPhoneNumber" ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "setupStatus" "WhatsAppSetupStatus" NOT NULL DEFAULT 'ACTIVE';
