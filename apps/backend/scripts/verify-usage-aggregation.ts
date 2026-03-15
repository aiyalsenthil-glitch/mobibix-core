import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

async function main() {
  const tenantCode = 'DEMO001'; // Adjust as needed
  const tenant = await prisma.tenant.findUnique({
    where: { code: tenantCode },
  });

  if (!tenant) {
    console.error('Tenant not found');
    return;
  }

  const token = 'YOUR_JWT_TOKEN'; // We might need to login first or use a known token
  // For now, let's just insert some data directly into DB and see if we can call the controller method implicitly
  // or just trust the logic if we can't easily curl.
  // Actually, let's just insert data using Prisma and print it out to verify the aggregation query works as expected.

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 1. Insert Usage Data for today
  await prisma.whatsAppDailyUsage.upsert({
    where: {
      tenantId_date: {
        tenantId: tenant.id,
        date: today,
      },
    },
    create: {
      tenantId: tenant.id,
      date: today,
      utility: 10,
      marketing: 5,
      service: 2,
      authentication: 1,
    },
    update: {
      utility: 10,
      marketing: 5,
      service: 2,
      authentication: 1,
    },
  });

  console.log('Inserted usage data for today.');

  // 2. Insert Usage Data for last month (should be excluded if monthly cycle)
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 2); // 2 months ago definitely out
  lastMonth.setHours(0, 0, 0, 0);

  await prisma.whatsAppDailyUsage.upsert({
    where: {
      tenantId_date: {
        tenantId: tenant.id,
        date: lastMonth,
      },
    },
    create: {
      tenantId: tenant.id,
      date: lastMonth,
      utility: 100,
      marketing: 50,
    },
    update: {
      utility: 100,
      marketing: 50,
    },
  });
  console.log('Inserted usage data for 2 months ago (should be excluded).');

  // 3. We can't easily call the controller without a full request context and auth.
  // But we can verify the Prisma aggregation query logic here.

  // Start of current month (simulating "No Subscription" or "Trial" logic)
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const usageAggregation = await prisma.whatsAppDailyUsage.aggregate({
    where: {
      tenantId: tenant.id,
      date: { gte: startOfMonth },
    },
    _sum: {
      utility: true,
      marketing: true,
      authentication: true,
      service: true,
    },
  });

  console.log('--- Aggregation Result (Current Month) ---');
  console.log(usageAggregation._sum);

  // Check if it matches today's insertion
  if (
    usageAggregation._sum.utility === 10 &&
    usageAggregation._sum.marketing === 5
  ) {
    console.log(
      '✅ Verification SUCCESS: Aggregation matches expected values.',
    );
  } else {
    console.log('❌ Verification FAILED: Aggregation does not match.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
