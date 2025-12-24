/*
  Warnings:

  - A unique constraint covering the columns `[kioskToken]` on the table `Tenant` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "kioskToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_kioskToken_key" ON "Tenant"("kioskToken");
