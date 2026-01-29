-- CreateEnum
CREATE TYPE "WhatsAppPhoneNumberPurpose" AS ENUM ('REMINDER', 'BILLING', 'MARKETING', 'DEFAULT');

-- CreateTable
CREATE TABLE "WhatsAppPhoneNumber" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "phoneNumberId" TEXT NOT NULL,
    "wabaId" TEXT NOT NULL,
    "purpose" "WhatsAppPhoneNumberPurpose" NOT NULL DEFAULT 'DEFAULT',
    "qualityRating" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppPhoneNumber_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WhatsAppPhoneNumber_tenantId_isActive_idx" ON "WhatsAppPhoneNumber"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "WhatsAppPhoneNumber_tenantId_purpose_idx" ON "WhatsAppPhoneNumber"("tenantId", "purpose");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppPhoneNumber_tenantId_phoneNumberId_key" ON "WhatsAppPhoneNumber"("tenantId", "phoneNumberId");
