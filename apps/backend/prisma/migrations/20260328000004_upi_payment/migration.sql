-- Phase 4 (UPI): Owner UPI ID for direct payment collection
-- Safe: single nullable column, no destructive changes

ALTER TABLE "Tenant"
    ADD COLUMN IF NOT EXISTS "gymUpiId" TEXT;
