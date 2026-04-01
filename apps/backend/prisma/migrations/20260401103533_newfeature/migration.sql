-- DropForeignKey
ALTER TABLE "gp_gym_class" DROP CONSTRAINT "gp_gym_class_tenantId_fkey";

-- AlterTable
ALTER TABLE "WhatsAppCampaignLog" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "gp_gym_class" ALTER COLUMN "dayOfWeek" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "gp_gym_class" ADD CONSTRAINT "gp_gym_class_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
