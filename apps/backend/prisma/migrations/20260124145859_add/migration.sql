-- AlterTable
ALTER TABLE "JobCard" ADD COLUMN     "billType" TEXT NOT NULL DEFAULT 'WITHOUT_GST',
ADD COLUMN     "devicePassword" TEXT,
ADD COLUMN     "diagnosticCharge" INTEGER DEFAULT 0;
