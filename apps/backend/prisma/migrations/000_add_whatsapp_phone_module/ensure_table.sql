BEGIN;

CREATE TABLE IF NOT EXISTS "WhatsAppPhoneNumberModule" (
    "id" TEXT NOT NULL,
    "moduleType" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "phoneNumberId" TEXT NOT NULL,
    "wabaId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL DEFAULT 'DEFAULT',
    "qualityRating" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WhatsAppPhoneNumberModule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WhatsAppPhoneNumberModule_moduleType_phoneNumberId_key" ON "WhatsAppPhoneNumberModule" ("moduleType", "phoneNumberId");
CREATE INDEX IF NOT EXISTS "WhatsAppPhoneNumberModule_moduleType_isActive_idx" ON "WhatsAppPhoneNumberModule" ("moduleType", "isActive");
CREATE INDEX IF NOT EXISTS "WhatsAppPhoneNumberModule_moduleType_purpose_idx" ON "WhatsAppPhoneNumberModule" ("moduleType", "purpose");

COMMIT;
