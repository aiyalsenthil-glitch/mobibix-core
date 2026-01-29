-- AlterTable
ALTER TABLE "WhatsAppSetting" ADD COLUMN     "dailyLimit" INTEGER,
ADD COLUMN     "defaultLanguage" TEXT NOT NULL DEFAULT 'en',
ADD COLUMN     "marketingOptInRequired" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "testPhone" TEXT;

-- CreateTable
CREATE TABLE "WhatsAppTemplate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "templateKey" TEXT NOT NULL,
    "metaTemplateName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppAutomation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "triggerType" "ReminderTriggerType" NOT NULL,
    "templateKey" TEXT NOT NULL,
    "offsetDays" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppAutomation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WhatsAppTemplate_tenantId_idx" ON "WhatsAppTemplate"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppTemplate_tenantId_templateKey_key" ON "WhatsAppTemplate"("tenantId", "templateKey");

-- CreateIndex
CREATE INDEX "WhatsAppAutomation_tenantId_idx" ON "WhatsAppAutomation"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppAutomation_tenantId_triggerType_key" ON "WhatsAppAutomation"("tenantId", "triggerType");

-- CreateIndex
CREATE INDEX "WhatsAppLog_tenantId_sentAt_idx" ON "WhatsAppLog"("tenantId", "sentAt");
