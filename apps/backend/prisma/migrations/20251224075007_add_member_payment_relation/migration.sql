-- CreateTable
CREATE TABLE "MemberPayment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "MemberPaymentStatus" NOT NULL,
    "method" TEXT,
    "reference" TEXT,
    "gstRate" DOUBLE PRECISION,
    "gstAmount" DOUBLE PRECISION,
    "total" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MemberPayment_tenantId_idx" ON "MemberPayment"("tenantId");

-- CreateIndex
CREATE INDEX "MemberPayment_memberId_idx" ON "MemberPayment"("memberId");

-- AddForeignKey
ALTER TABLE "MemberPayment" ADD CONSTRAINT "MemberPayment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
