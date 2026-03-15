-- CreateEnum
CREATE TYPE "LedgerPaymentMethod" AS ENUM ('CASH', 'UPI', 'BANK');

-- AlterTable
ALTER TABLE "LedgerCollection" ADD COLUMN     "paidAmount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "LedgerPayment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ledgerId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "collectedBy" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "method" "LedgerPaymentMethod" NOT NULL,
    "note" TEXT,
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LedgerPayment_tenantId_idx" ON "LedgerPayment"("tenantId");

-- CreateIndex
CREATE INDEX "LedgerPayment_ledgerId_idx" ON "LedgerPayment"("ledgerId");

-- CreateIndex
CREATE INDEX "LedgerPayment_customerId_idx" ON "LedgerPayment"("customerId");

-- CreateIndex
CREATE INDEX "LedgerPayment_collectionId_idx" ON "LedgerPayment"("collectionId");

-- CreateIndex
CREATE INDEX "LedgerPayment_collectedBy_idx" ON "LedgerPayment"("collectedBy");

-- AddForeignKey
ALTER TABLE "LedgerPayment" ADD CONSTRAINT "LedgerPayment_ledgerId_fkey" FOREIGN KEY ("ledgerId") REFERENCES "LedgerAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerPayment" ADD CONSTRAINT "LedgerPayment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "LedgerCustomer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerPayment" ADD CONSTRAINT "LedgerPayment_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "LedgerCollection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerPayment" ADD CONSTRAINT "LedgerPayment_collectedBy_fkey" FOREIGN KEY ("collectedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerPayment" ADD CONSTRAINT "LedgerPayment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
