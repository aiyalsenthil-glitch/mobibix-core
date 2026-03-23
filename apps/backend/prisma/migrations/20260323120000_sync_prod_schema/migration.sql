-- Sync prod DB schema to match Prisma schema.
-- All changes are additive (new column, FKs, index renames) — zero data loss.
-- FKs that may have orphaned demo data use NOT VALID to enforce on new rows only.

-- AlterTable: fix tokenExpiresAt type precision
ALTER TABLE "WhatsAppPhoneNumber" ALTER COLUMN "tokenExpiresAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable: add sourceQuotationId to customer follow-ups
ALTER TABLE "mb_customer_follow_up" ADD COLUMN     "sourceQuotationId" TEXT;

-- AddForeignKey (sourceQuotationId is new column — all nulls, safe to validate immediately)
ALTER TABLE "mb_customer_follow_up" ADD CONSTRAINT "mb_customer_follow_up_sourceQuotationId_fkey" FOREIGN KEY ("sourceQuotationId") REFERENCES "mb_quotation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey NOT VALID — prod may have orphaned demo rows; new rows will be enforced
ALTER TABLE "mb_emi_application" ADD CONSTRAINT "mb_emi_application_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "mb_invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE NOT VALID;

ALTER TABLE "mb_installment_plan" ADD CONSTRAINT "mb_installment_plan_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "mb_invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE NOT VALID;

ALTER TABLE "mb_installment_plan" ADD CONSTRAINT "mb_installment_plan_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "mb_party"("id") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;

-- RenameIndex
ALTER INDEX "mb_device_model_request_brand_model_idx" RENAME TO "mb_device_model_request_parsedBrand_parsedModel_idx";

-- RenameIndex
ALTER INDEX "mb_installment_plan_shopId_planNumber" RENAME TO "mb_installment_plan_shopId_planNumber_key";
