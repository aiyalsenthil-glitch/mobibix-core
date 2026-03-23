-- Make collectionId nullable on LedgerPayment to support INTEREST_ONLY payments
ALTER TABLE "lg_ledger_payment" ALTER COLUMN "collectionId" DROP NOT NULL;
