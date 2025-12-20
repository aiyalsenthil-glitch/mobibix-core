-- CreateEnum
CREATE TYPE "AttendanceSource" AS ENUM ('MANUAL', 'QR', 'BIOMETRIC');

-- CreateTable
CREATE TABLE "GymAttendance" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "checkInTime" TIMESTAMP(3) NOT NULL,
    "checkOutTime" TIMESTAMP(3),
    "source" "AttendanceSource" NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GymAttendance_tenantId_idx" ON "GymAttendance"("tenantId");

-- CreateIndex
CREATE INDEX "GymAttendance_memberId_idx" ON "GymAttendance"("memberId");

-- AddForeignKey
ALTER TABLE "GymAttendance" ADD CONSTRAINT "GymAttendance_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
