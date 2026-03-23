-- CreateEnum
CREATE TYPE "DistributorLinkStatus" AS ENUM ('PENDING', 'ACTIVE', 'INACTIVE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "DistOrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DistPaymentType" AS ENUM ('CASH', 'UPI', 'BANK_TRANSFER', 'CREDIT');

-- CreateTable
CREATE TABLE "dist_distributors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "referralCode" TEXT NOT NULL,
    "contactPerson" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "logoUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dist_distributors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dist_distributor_retailers" (
    "id" TEXT NOT NULL,
    "distributorId" TEXT NOT NULL,
    "retailerId" TEXT NOT NULL,
    "status" "DistributorLinkStatus" NOT NULL DEFAULT 'PENDING',
    "linkedVia" TEXT NOT NULL,
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dist_distributor_retailers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dist_catalog_items" (
    "id" TEXT NOT NULL,
    "distributorId" TEXT NOT NULL,
    "sku" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "brand" TEXT,
    "category" TEXT,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "stockQuantity" INTEGER NOT NULL DEFAULT 0,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "compatibility" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dist_catalog_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dist_purchase_orders" (
    "id" TEXT NOT NULL,
    "distributorId" TEXT NOT NULL,
    "retailerId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "status" "DistOrderStatus" NOT NULL DEFAULT 'PENDING',
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "paymentType" "DistPaymentType" NOT NULL DEFAULT 'CASH',
    "notes" TEXT,
    "shippedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dist_purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dist_purchase_order_items" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "catalogItemId" TEXT NOT NULL,
    "quantityOrdered" INTEGER NOT NULL,
    "quantityReceived" INTEGER NOT NULL DEFAULT 0,
    "unitPriceAtOrder" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "dist_purchase_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dist_product_mapping" (
    "id" TEXT NOT NULL,
    "retailerId" TEXT NOT NULL,
    "catalogItemId" TEXT NOT NULL,
    "retailerProductId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dist_product_mapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dist_credit_ledger" (
    "id" TEXT NOT NULL,
    "distributorId" TEXT NOT NULL,
    "retailerId" TEXT NOT NULL,
    "entryType" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "description" TEXT,
    "runningBalance" DECIMAL(12,2) NOT NULL,
    "entryDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dist_credit_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dist_sale_attribution_log" (
    "id" TEXT NOT NULL,
    "distributorId" TEXT NOT NULL,
    "retailerId" TEXT NOT NULL,
    "catalogItemId" TEXT,
    "saleItemRef" TEXT,
    "quantitySold" INTEGER NOT NULL,
    "revenueAmount" DECIMAL(12,2),
    "saleDate" DATE NOT NULL,
    "weekBucket" VARCHAR(7),
    "monthBucket" VARCHAR(7),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dist_sale_attribution_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dist_distributors_referralCode_key" ON "dist_distributors"("referralCode");

-- CreateIndex
CREATE UNIQUE INDEX "dist_distributors_email_key" ON "dist_distributors"("email");

-- CreateIndex
CREATE INDEX "dist_distributor_retailers_retailerId_idx" ON "dist_distributor_retailers"("retailerId");

-- CreateIndex
CREATE UNIQUE INDEX "dist_distributor_retailers_distributorId_retailerId_key" ON "dist_distributor_retailers"("distributorId", "retailerId");

-- CreateIndex
CREATE INDEX "dist_catalog_items_distributorId_idx" ON "dist_catalog_items"("distributorId");

-- CreateIndex
CREATE INDEX "dist_catalog_items_brand_category_idx" ON "dist_catalog_items"("brand", "category");

-- CreateIndex
CREATE UNIQUE INDEX "dist_purchase_orders_orderNumber_key" ON "dist_purchase_orders"("orderNumber");

-- CreateIndex
CREATE INDEX "dist_purchase_orders_distributorId_status_idx" ON "dist_purchase_orders"("distributorId", "status");

-- CreateIndex
CREATE INDEX "dist_purchase_orders_retailerId_idx" ON "dist_purchase_orders"("retailerId");

-- CreateIndex
CREATE UNIQUE INDEX "dist_product_mapping_retailerId_catalogItemId_key" ON "dist_product_mapping"("retailerId", "catalogItemId");

-- CreateIndex
CREATE UNIQUE INDEX "dist_product_mapping_retailerId_retailerProductId_key" ON "dist_product_mapping"("retailerId", "retailerProductId");

-- CreateIndex
CREATE INDEX "dist_credit_ledger_distributorId_idx" ON "dist_credit_ledger"("distributorId");

-- CreateIndex
CREATE INDEX "dist_credit_ledger_retailerId_idx" ON "dist_credit_ledger"("retailerId");

-- CreateIndex
CREATE INDEX "dist_sale_attribution_log_distributorId_idx" ON "dist_sale_attribution_log"("distributorId");

-- CreateIndex
CREATE INDEX "dist_sale_attribution_log_distributorId_monthBucket_idx" ON "dist_sale_attribution_log"("distributorId", "monthBucket");

-- CreateIndex
CREATE INDEX "dist_sale_attribution_log_distributorId_retailerId_idx" ON "dist_sale_attribution_log"("distributorId", "retailerId");

-- AddForeignKey
ALTER TABLE "dist_distributor_retailers" ADD CONSTRAINT "dist_distributor_retailers_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "dist_distributors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dist_catalog_items" ADD CONSTRAINT "dist_catalog_items_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "dist_distributors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dist_purchase_orders" ADD CONSTRAINT "dist_purchase_orders_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "dist_distributors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dist_purchase_order_items" ADD CONSTRAINT "dist_purchase_order_items_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "dist_purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dist_purchase_order_items" ADD CONSTRAINT "dist_purchase_order_items_catalogItemId_fkey" FOREIGN KEY ("catalogItemId") REFERENCES "dist_catalog_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dist_product_mapping" ADD CONSTRAINT "dist_product_mapping_catalogItemId_fkey" FOREIGN KEY ("catalogItemId") REFERENCES "dist_catalog_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dist_credit_ledger" ADD CONSTRAINT "dist_credit_ledger_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "dist_distributors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dist_sale_attribution_log" ADD CONSTRAINT "dist_sale_attribution_log_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "dist_distributors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dist_sale_attribution_log" ADD CONSTRAINT "dist_sale_attribution_log_catalogItemId_fkey" FOREIGN KEY ("catalogItemId") REFERENCES "dist_catalog_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
