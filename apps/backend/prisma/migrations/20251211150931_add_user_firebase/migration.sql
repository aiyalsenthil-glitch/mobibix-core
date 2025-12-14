/*
  Warnings:

  - You are about to drop the column `REMOVED_AUTH_PROVIDERId` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[REMOVED_AUTH_PROVIDERUid]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `REMOVED_AUTH_PROVIDERUid` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "User_REMOVED_AUTH_PROVIDERId_key";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "REMOVED_AUTH_PROVIDERId",
ADD COLUMN     "email" TEXT,
ADD COLUMN     "REMOVED_AUTH_PROVIDERUid" TEXT NOT NULL,
ADD COLUMN     "phone" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_REMOVED_AUTH_PROVIDERUid_key" ON "User"("REMOVED_AUTH_PROVIDERUid");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
