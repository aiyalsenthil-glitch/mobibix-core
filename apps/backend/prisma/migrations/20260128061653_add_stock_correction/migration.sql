-- CreateTable
CREATE TABLE "StockCorrection" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "shopProductId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "note" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockCorrection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StockCorrection_tenantId_shopId_idx" ON "StockCorrection"("tenantId", "shopId");

-- CreateIndex
CREATE INDEX "StockCorrection_shopProductId_idx" ON "StockCorrection"("shopProductId");

-- CreateIndex
CREATE INDEX "StockCorrection_createdAt_idx" ON "StockCorrection"("createdAt");

-- AddForeignKey
ALTER TABLE "StockCorrection" ADD CONSTRAINT "StockCorrection_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockCorrection" ADD CONSTRAINT "StockCorrection_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockCorrection" ADD CONSTRAINT "StockCorrection_shopProductId_fkey" FOREIGN KEY ("shopProductId") REFERENCES "ShopProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
