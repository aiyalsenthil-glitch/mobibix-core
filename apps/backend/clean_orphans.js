const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanOrphansAndRunTests() {
  console.log('--- Cleaning Orphan Invoices and Payments ---');
  
  // Find count of orphans
  const getOrphansQuery = `
    SELECT count(*) as count 
    FROM "Payment" p 
    LEFT JOIN "Tenant" t ON p."tenantId" = t.id 
    LEFT JOIN "Plan" pl ON p."planId" = pl.id
    WHERE t.id IS NULL OR pl.id IS NULL
  `;
  const orphans = await prisma.$queryRawUnsafe(getOrphansQuery);
  console.log(`Found ${Number(orphans[0].count)} orphan payment(s).`);

  if (Number(orphans[0].count) > 0) {
    // 1. Delete dependent SubscriptionInvoices
    const delInvoices = await prisma.$executeRawUnsafe(`
      DELETE FROM "SubscriptionInvoice"
      WHERE "paymentId" IN (
        SELECT p.id 
        FROM "Payment" p 
        LEFT JOIN "Tenant" t ON p."tenantId" = t.id 
        LEFT JOIN "Plan" pl ON p."planId" = pl.id
        WHERE t.id IS NULL OR pl.id IS NULL
      )
    `);
    console.log(`Deleted ${delInvoices} orphan SubscriptionInvoice(s).`);

    // 2. Delete the Payments
    const delPayments = await prisma.$executeRawUnsafe(`
      DELETE FROM "Payment"
      WHERE id IN (
        SELECT p.id 
        FROM "Payment" p 
        LEFT JOIN "Tenant" t ON p."tenantId" = t.id 
        LEFT JOIN "Plan" pl ON p."planId" = pl.id
        WHERE t.id IS NULL OR pl.id IS NULL
      )
    `);
    console.log(`Deleted ${delPayments} orphan Payment(s).`);
  }
}

cleanOrphansAndRunTests()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
