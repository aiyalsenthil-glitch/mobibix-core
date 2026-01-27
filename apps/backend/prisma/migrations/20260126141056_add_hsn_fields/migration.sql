/*
  Warnings:

  - Added the required column `updatedAt` to the `HSNCode` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "HSNCode" ADD COLUMN     "description" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;
