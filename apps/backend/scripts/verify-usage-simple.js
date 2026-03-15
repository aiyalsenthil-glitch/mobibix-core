
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const tenantCode = 'DEMO001'; 
  const tenant = await prisma.tenant.findUnique({ where: { code: tenantCode } });

  if (!tenant) {
    console.error('Tenant not found');
    return;
  }

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
    }
  });

  console.log('Inserted usage data for today.');

  // 2. Insert Usage Data for last month
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 2); 
  lastMonth.setHours(0,0,0,0);

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
    }
  });
  console.log('Inserted usage data for 2 months ago (should be excluded).');
  
  // 3. Verify Aggregation
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0,0,0,0);
  
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
    console.log(JSON.stringify(usageAggregation._sum, null, 2));
    
    if (usageAggregation._sum.utility === 10 && usageAggregation._sum.marketing === 5) {
        console.log('✅ Verification SUCCESS: Aggregation matches expected values.');
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
