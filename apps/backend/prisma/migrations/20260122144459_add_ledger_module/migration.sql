/*
  Warnings:

  - You are about to drop the column `imei` on the `JobCard` table. All the data in the column will be lost.
  - You are about to drop the column `problem` on the `JobCard` table. All the data in the column will be lost.
  - Added the required column `createdByName` to the `JobCard` table without a default value. This is not possible if the table is not empty.
  - Added the required column `createdByUserId` to the `JobCard` table without a default value. This is not possible if the table is not empty.
  - Added the required column `customerComplaint` to the `JobCard` table without a default value. This is not possible if the table is not empty.
  - Added the required column `deviceType` to the `JobCard` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "LedgerInstallmentType" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "LedgerStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CLOSED');

-- AlterTable
ALTER TABLE "JobCard" DROP COLUMN "imei",
DROP COLUMN "problem",
ADD COLUMN     "advancePaid" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "createdByName" TEXT NOT NULL,
ADD COLUMN     "createdByUserId" TEXT NOT NULL,
ADD COLUMN     "customerAltPhone" TEXT,
ADD COLUMN     "customerComplaint" TEXT NOT NULL,
ADD COLUMN     "deviceSerial" TEXT,
ADD COLUMN     "deviceType" TEXT NOT NULL,
ADD COLUMN     "estimatedDelivery" TIMESTAMP(3),
ADD COLUMN     "physicalCondition" TEXT;

-- CreateTable
CREATE TABLE "LedgerCustomer" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerAccount" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "principalAmount" INTEGER NOT NULL,
    "expectedTotal" INTEGER NOT NULL,
    "installmentType" "LedgerInstallmentType" NOT NULL,
    "installmentAmount" INTEGER NOT NULL,
    "totalPeriods" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "status" "LedgerStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerCollection" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ledgerId" TEXT NOT NULL,
    "periodNo" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "amount" INTEGER NOT NULL,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerCollection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LedgerCustomer_tenantId_idx" ON "LedgerCustomer"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "LedgerCustomer_tenantId_phone_key" ON "LedgerCustomer"("tenantId", "phone");

-- CreateIndex
CREATE INDEX "LedgerAccount_tenantId_idx" ON "LedgerAccount"("tenantId");

-- CreateIndex
CREATE INDEX "LedgerAccount_customerId_idx" ON "LedgerAccount"("customerId");

-- CreateIndex
CREATE INDEX "LedgerCollection_tenantId_idx" ON "LedgerCollection"("tenantId");

-- CreateIndex
CREATE INDEX "LedgerCollection_ledgerId_idx" ON "LedgerCollection"("ledgerId");

-- AddForeignKey
ALTER TABLE "LedgerCustomer" ADD CONSTRAINT "LedgerCustomer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerAccount" ADD CONSTRAINT "LedgerAccount_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerAccount" ADD CONSTRAINT "LedgerAccount_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "LedgerCustomer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerCollection" ADD CONSTRAINT "LedgerCollection_ledgerId_fkey" FOREIGN KEY ("ledgerId") REFERENCES "LedgerAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
