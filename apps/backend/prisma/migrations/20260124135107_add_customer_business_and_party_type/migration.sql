-- CreateEnum
CREATE TYPE "PartyType" AS ENUM ('CUSTOMER', 'VENDOR', 'BOTH');

-- CreateEnum
CREATE TYPE "BusinessType" AS ENUM ('B2C', 'B2B');

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "businessType" "BusinessType" NOT NULL DEFAULT 'B2C',
ADD COLUMN     "email" TEXT,
ADD COLUMN     "partyType" "PartyType" NOT NULL DEFAULT 'CUSTOMER';
