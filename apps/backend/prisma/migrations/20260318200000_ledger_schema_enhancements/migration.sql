-- LedgerCustomer: add email, notes
ALTER TABLE "lg_ledger_customer" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "lg_ledger_customer" ADD COLUMN IF NOT EXISTS "notes" TEXT;

-- LedgerAccount: add interest fields
ALTER TABLE "lg_ledger_account" ADD COLUMN IF NOT EXISTS "interestRate" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "lg_ledger_account" ADD COLUMN IF NOT EXISTS "interestRateType" TEXT NOT NULL DEFAULT 'RUPEES';
ALTER TABLE "lg_ledger_account" ADD COLUMN IF NOT EXISTS "interestAmount" INTEGER NOT NULL DEFAULT 0;

-- LedgerCollection: add interest-only and note fields
ALTER TABLE "lg_ledger_collection" ADD COLUMN IF NOT EXISTS "isInterestOnly" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "lg_ledger_collection" ADD COLUMN IF NOT EXISTS "collectionNote" TEXT;

-- LedgerPayment: add paymentType
ALTER TABLE "lg_ledger_payment" ADD COLUMN IF NOT EXISTS "paymentType" TEXT NOT NULL DEFAULT 'FULL';
