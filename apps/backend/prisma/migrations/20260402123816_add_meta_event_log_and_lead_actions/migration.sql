-- CreateTable
CREATE TABLE "MetaEventLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "whatsAppNumberId" TEXT,
    "eventType" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "response" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MetaEventLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MetaEventLog_tenantId_idx" ON "MetaEventLog"("tenantId");

-- CreateIndex
CREATE INDEX "MetaEventLog_eventType_idx" ON "MetaEventLog"("eventType");

-- CreateIndex
CREATE INDEX "MetaEventLog_createdAt_idx" ON "MetaEventLog"("createdAt");

-- AddForeignKey
ALTER TABLE "MetaEventLog" ADD CONSTRAINT "MetaEventLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
