-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "updatedBy" TEXT;

-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "updatedBy" TEXT;

-- AlterTable
ALTER TABLE "Shop" ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "updatedBy" TEXT;

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "updatedBy" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "updatedBy" TEXT;
