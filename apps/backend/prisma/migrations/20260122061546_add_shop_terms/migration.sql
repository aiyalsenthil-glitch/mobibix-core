-- AlterTable
ALTER TABLE "Shop" ADD COLUMN     "terms" TEXT[] DEFAULT ARRAY[]::TEXT[];
