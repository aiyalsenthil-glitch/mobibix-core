/*
  Warnings:

  - A unique constraint covering the columns `[id,tenantId,phone]` on the table `Member` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Member_tenantId_phone_key";

-- CreateIndex
CREATE UNIQUE INDEX "Member_id_tenantId_phone_key" ON "Member"("id", "tenantId", "phone");
