-- DropIndex
DROP INDEX "StockLedger_shopId_idx";

-- DropIndex
DROP INDEX "StockLedger_shopProductId_idx";

-- DropIndex
DROP INDEX "StockLedger_tenantId_idx";

-- CreateIndex
CREATE INDEX "StockLedger_tenantId_shopId_createdAt_idx" ON "StockLedger"("tenantId", "shopId", "createdAt");

-- CreateIndex
CREATE INDEX "StockLedger_shopProductId_createdAt_idx" ON "StockLedger"("shopProductId", "createdAt");

-- CreateIndex
CREATE INDEX "StockLedger_tenantId_shopId_type_idx" ON "StockLedger"("tenantId", "shopId", "type");
