/*
  Warnings:

  - Added the required column `paymentDueDate` to the `Member` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "paymentDueDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "paymentReminderSent" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "maxMembers" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN     "whatsappEnabled" BOOLEAN NOT NULL DEFAULT true;
