const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Database Integrity Audit ---');
  const results = await prisma.$queryRawUnsafe(`
    -- 1. Initialize checks summary
    SELECT 'Duplicate Active Subscriptions' as check, 
      (SELECT COUNT(*) FROM (
         SELECT "tenantId", COUNT(*) 
         FROM "TenantSubscription" 
         WHERE status = 'ACTIVE' 
         GROUP BY "tenantId", "module" 
         HAVING COUNT(*) > 1
       ) as dupes) as potential_issues
    
    UNION ALL
    
    -- 2. Overlapping Billing Cycles
    SELECT 'Overlapping Billing Cycles' as check,
      (SELECT COUNT(*) FROM (
        SELECT a.id
        FROM "TenantSubscription" a
        JOIN "TenantSubscription" b 
          ON a."tenantId" = b."tenantId" 
          AND a.module = b.module 
          AND a.id < b.id
        WHERE a."startDate" < b."endDate" 
          AND a."endDate" > b."startDate"
          AND a.status IN ('ACTIVE', 'PAST_DUE')
          AND b.status IN ('ACTIVE', 'PAST_DUE')
      ) as overlap_check) as potential_issues
    
    UNION ALL
    
    -- 3. Orphan Payments (Payment without a valid Plan or Tenant)
    SELECT 'Orphan/Dangling Payments' as check,
      (SELECT COUNT(*) FROM (
        SELECT p.id 
        FROM "Payment" p 
        LEFT JOIN "Tenant" t ON p."tenantId" = t.id 
        LEFT JOIN "Plan" pl ON p."planId" = pl.id
        WHERE t.id IS NULL OR pl.id IS NULL
      ) as orphans) as potential_issues
    
    UNION ALL
    
    -- 4. Invalid Foreign Keys (Subscriptions without Tenant)
    SELECT 'Invalid FKs (Subscriptions w/o Tenant)' as check,
      (SELECT COUNT(*) FROM (
        SELECT s.id 
        FROM "TenantSubscription" s 
        LEFT JOIN "Tenant" t ON s."tenantId" = t.id 
        WHERE t.id IS NULL
      ) as invalid_fks) as potential_issues
    
    UNION ALL
    
    -- 5. Negative Balances / Invalid Amounts
    SELECT 'Negative/Zero Payment Amounts' as check,
      (SELECT COUNT(*) FROM (
        SELECT id 
        FROM "Payment" 
        WHERE amount <= 0 AND status = 'SUCCESS'
      ) as negatives) as potential_issues
    
    UNION ALL
    
    -- 6. Idempotent webhook processing failures
    SELECT 'Non-Idempotent Webhooks (Duplicate SUCCESS)' as check,
      (SELECT COUNT(*) FROM (
        SELECT "referenceId" 
        FROM "WebhookEvent" 
        WHERE status = 'SUCCESS' AND "referenceId" IS NOT NULL
        GROUP BY "referenceId" 
        HAVING COUNT(*) > 1
      ) as dup_webhooks) as potential_issues;
  `);

  console.table(results);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
