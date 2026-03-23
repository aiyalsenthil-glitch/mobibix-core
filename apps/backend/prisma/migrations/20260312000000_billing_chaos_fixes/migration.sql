-- Billing Chaos Fix: C-2 / H-3
-- Partial unique index on TenantSubscription to prevent duplicate PENDING/ACTIVE rows
-- for the same tenant+module combination.
--
-- Problem: concurrent calls to buyPlanPhase1 could both pass the existingSub check
-- (finding null) and both INSERT new rows with status=PENDING, resulting in two payment
-- links being sent to the user and potential double charge.
--
-- This index makes the second INSERT fail at the DB layer rather than at application layer.
-- Covers PENDING (double buy race) and ACTIVE (should never have two ACTIVE rows per module).
-- PAST_DUE is excluded intentionally — it already has a row, handled by the existingSub fix.

CREATE UNIQUE INDEX IF NOT EXISTS "idx_unique_active_sub_per_module"
ON "TenantSubscription" ("tenantId", "module")
WHERE status IN ('ACTIVE', 'PENDING');

-- Note: If your actual PostgreSQL table name differs (e.g. uses snake_case mapping),
-- replace "TenantSubscription" with the real table name from your DB.
-- To verify: SELECT tablename FROM pg_tables WHERE tablename ILIKE '%subscription%';


-- Invoice sequence for atomic, collision-free invoice number generation
-- Used by InvoiceService.generateInvoiceNumber()
CREATE SEQUENCE IF NOT EXISTS subscription_invoice_seq START 1 INCREMENT 1;
