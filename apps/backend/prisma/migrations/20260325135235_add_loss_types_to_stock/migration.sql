-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "StockRefType" ADD VALUE 'LOSS';
ALTER TYPE "StockRefType" ADD VALUE 'DAMAGE';
ALTER TYPE "StockRefType" ADD VALUE 'THEFT';
ALTER TYPE "StockRefType" ADD VALUE 'INTERNAL_USE';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "fcmToken" TEXT;

-- AlterTable
ALTER TABLE "mb_notification_log" ADD COLUMN     "body" TEXT;
