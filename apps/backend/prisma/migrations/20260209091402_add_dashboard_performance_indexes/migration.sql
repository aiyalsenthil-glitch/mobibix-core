-- CreateIndex
CREATE INDEX "Invoice_tenantId_shopId_createdAt_idx" ON "Invoice"("tenantId", "shopId", "createdAt");

-- CreateIndex
CREATE INDEX "JobCard_tenantId_shopId_status_createdAt_idx" ON "JobCard"("tenantId", "shopId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ShopProduct_tenantId_shopId_isActive_idx" ON "ShopProduct"("tenantId", "shopId", "isActive");
