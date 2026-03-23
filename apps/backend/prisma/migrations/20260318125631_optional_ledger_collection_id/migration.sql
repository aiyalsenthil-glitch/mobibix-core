-- DropForeignKey
ALTER TABLE "lg_ledger_payment" DROP CONSTRAINT "lg_ledger_payment_collectionId_fkey";

-- AddForeignKey
ALTER TABLE "lg_ledger_payment" ADD CONSTRAINT "lg_ledger_payment_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "lg_ledger_collection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
