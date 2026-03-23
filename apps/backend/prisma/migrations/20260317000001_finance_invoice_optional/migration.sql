-- Make invoiceId optional on EmiApplication and InstallmentPlan
-- These tables can exist independently of an Invoice for standalone finance tracking

ALTER TABLE "mb_emi_application" ALTER COLUMN "invoiceId" DROP NOT NULL;
ALTER TABLE "mb_installment_plan" ALTER COLUMN "invoiceId" DROP NOT NULL;
