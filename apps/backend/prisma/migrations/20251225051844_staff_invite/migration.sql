/*
  Warnings:

  - A unique constraint covering the columns `[tenantId,email]` on the table `StaffInvite` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "StaffInvite" ADD COLUMN     "accepted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'STAFF';

-- CreateIndex
CREATE UNIQUE INDEX "StaffInvite_tenantId_email_key" ON "StaffInvite"("tenantId", "email");
