/*
  Warnings:

  - You are about to drop the column `endDate` on the `Member` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `Member` table. All the data in the column will be lost.
  - You are about to drop the column `startDate` on the `Member` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `Member` table without a default value. This is not possible if the table is not empty.
  - Made the column `phone` on table `Member` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Member" DROP COLUMN "endDate",
DROP COLUMN "isActive",
DROP COLUMN "startDate",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "phone" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Member_tenantId_idx" ON "Member"("tenantId");
