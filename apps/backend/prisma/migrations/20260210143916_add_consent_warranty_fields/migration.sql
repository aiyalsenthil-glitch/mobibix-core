-- AlterTable
ALTER TABLE "JobCard" ADD COLUMN     "consentAt" TIMESTAMP(3),
ADD COLUMN     "consentNonRefundable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "consentSignatureUrl" TEXT,
ADD COLUMN     "warrantyAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "warrantyExclusions" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "warrantyType" TEXT DEFAULT 'BOTH';
