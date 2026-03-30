-- AlterTable
ALTER TABLE "lg_ledger_account" ADD COLUMN     "agentCommissionRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "gracePeriodDays" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "guarantorAddress" TEXT,
ADD COLUMN     "guarantorName" TEXT,
ADD COLUMN     "guarantorPhone" TEXT,
ADD COLUMN     "kyc_document_url" TEXT,
ADD COLUMN     "metadata" JSONB DEFAULT '{}',
ADD COLUMN     "penaltyType" TEXT NOT NULL DEFAULT 'NONE',
ADD COLUMN     "penaltyValue" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "processingFee" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "skipSundays" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "lg_ledger_payment" ADD COLUMN     "agentCommission" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "penaltyPaid" INTEGER NOT NULL DEFAULT 0;
