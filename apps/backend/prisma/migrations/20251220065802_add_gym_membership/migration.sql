-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'EXPIRED');

-- CreateTable
CREATE TABLE "GymMembership" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymMembership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GymMembership_tenantId_idx" ON "GymMembership"("tenantId");

-- CreateIndex
CREATE INDEX "GymMembership_memberId_idx" ON "GymMembership"("memberId");

-- AddForeignKey
ALTER TABLE "GymMembership" ADD CONSTRAINT "GymMembership_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
