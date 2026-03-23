-- Add missing SubscriptionStatus enum values that exist in schema but were never migrated.
-- Must be in a separate migration from any SQL that uses these values (PostgreSQL requirement).
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'PENDING';
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'PAST_DUE';
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'DISPUTED';
