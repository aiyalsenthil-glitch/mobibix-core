-- AlterEnum
ALTER TYPE "ReminderTriggerType" ADD VALUE 'DIGITAL_LEDGER_PAYMENT';

-- DropIndex
DROP INDEX "gp_member_fitnessProfileId_idx";

-- AlterTable
ALTER TABLE "gp_fitness_profile" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "gp_gym_expense" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "gp_gym_plan" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- RenameIndex
ALTER INDEX "gp_fitness_profile_fbuid_key" RENAME TO "gp_fitness_profile_REMOVED_AUTH_PROVIDERUid_key";
