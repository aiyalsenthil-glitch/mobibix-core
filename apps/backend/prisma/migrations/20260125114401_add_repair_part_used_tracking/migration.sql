-- CreateTable
CREATE TABLE "RepairPartUsed" (
    "id" TEXT NOT NULL,
    "jobCardId" TEXT NOT NULL,
    "shopProductId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RepairPartUsed_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RepairPartUsed_jobCardId_idx" ON "RepairPartUsed"("jobCardId");

-- CreateIndex
CREATE UNIQUE INDEX "RepairPartUsed_jobCardId_shopProductId_key" ON "RepairPartUsed"("jobCardId", "shopProductId");

-- AddForeignKey
ALTER TABLE "RepairPartUsed" ADD CONSTRAINT "RepairPartUsed_jobCardId_fkey" FOREIGN KEY ("jobCardId") REFERENCES "JobCard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairPartUsed" ADD CONSTRAINT "RepairPartUsed_shopProductId_fkey" FOREIGN KEY ("shopProductId") REFERENCES "ShopProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
