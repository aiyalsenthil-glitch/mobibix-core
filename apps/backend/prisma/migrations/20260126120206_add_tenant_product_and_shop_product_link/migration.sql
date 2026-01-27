-- AlterTable
ALTER TABLE "ShopProduct" ADD COLUMN     "tenantProductId" TEXT;

-- CreateTable
CREATE TABLE "TenantProduct" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "hsnId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantProduct_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TenantProduct_tenantId_idx" ON "TenantProduct"("tenantId");

-- CreateIndex
CREATE INDEX "TenantProduct_categoryId_idx" ON "TenantProduct"("categoryId");

-- CreateIndex
CREATE INDEX "TenantProduct_hsnId_idx" ON "TenantProduct"("hsnId");

-- CreateIndex
CREATE UNIQUE INDEX "TenantProduct_tenantId_name_categoryId_key" ON "TenantProduct"("tenantId", "name", "categoryId");

-- CreateIndex
CREATE INDEX "ShopProduct_tenantProductId_idx" ON "ShopProduct"("tenantProductId");

-- AddForeignKey
ALTER TABLE "TenantProduct" ADD CONSTRAINT "TenantProduct_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantProduct" ADD CONSTRAINT "TenantProduct_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProductCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantProduct" ADD CONSTRAINT "TenantProduct_hsnId_fkey" FOREIGN KEY ("hsnId") REFERENCES "HSNCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopProduct" ADD CONSTRAINT "ShopProduct_tenantProductId_fkey" FOREIGN KEY ("tenantProductId") REFERENCES "TenantProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;
