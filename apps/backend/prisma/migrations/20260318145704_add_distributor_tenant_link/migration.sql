/*
  Warnings:

  - A unique constraint covering the columns `[tenantId]` on the table `dist_distributors` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "dist_distributors" ADD COLUMN     "tenantId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "dist_distributors_tenantId_key" ON "dist_distributors"("tenantId");
