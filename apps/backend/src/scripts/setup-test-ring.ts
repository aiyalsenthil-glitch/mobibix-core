import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createTestTenants() {
  console.log('🚀 Setting up Production Test Ring...');

  const testTenants = [
    {
      code: 'TEST_FREE',
      name: 'GymPilot Free Test',
      status: 'ACTIVE',
      expectedPlan: 'STANDARD', // Default assigned plan usually
    },
    {
      code: 'TEST_SUB_ACTIVE',
      name: 'GymPilot Pro Test',
      status: 'ACTIVE',
      expectedPlan: 'PRO',
    },
    {
      code: 'TEST_EXPIRED',
      name: 'GymPilot Expired Test',
      status: 'ACTIVE',
      expectedPlan: 'PRO',
    },
  ];

  for (const t of testTenants) {
    const tenant = await prisma.tenant.upsert({
      where: { code: t.code },
      update: {
        name: t.name,
        status: t.status as any,
      },
      create: {
        code: t.code,
        name: t.name,
        businessType: 'GYM',
        tenantType: 'SAAS',
        status: t.status as any,
      },
    });

    console.log(`✅ Created/Verified Tenant: ${t.code} (${tenant.id})`);

    // Assign appropriate subscriptions based on the test type
    const plan = await prisma.plan.findFirst({
      where: { code: t.expectedPlan, module: 'GYM' },
    });

    if (!plan) {
      console.warn(
        `⚠️  Plan ${t.expectedPlan} not found. Skipping subscription setup for ${t.code}.`,
      );
      continue;
    }

    const subStartDate = new Date();
    const subEndDate = new Date();
    let subStatus = 'ACTIVE';

    if (t.code === 'TEST_EXPIRED') {
      // Expired 30 days ago (past any grace periods)
      subEndDate.setDate(subEndDate.getDate() - 30);
      subStatus = 'EXPIRED';
    } else {
      // Active for 1 year
      subEndDate.setFullYear(subEndDate.getFullYear() + 1);
    }

    const existingSub = await prisma.tenantSubscription.findFirst({
      where: {
        tenantId: tenant.id,
        module: 'GYM',
      },
    });

    if (existingSub) {
      await prisma.tenantSubscription.update({
        where: { id: existingSub.id },
        data: {
          planId: plan.id,
          status: subStatus as any,
          endDate: subEndDate,
        },
      });
    } else {
      await prisma.tenantSubscription.create({
        data: {
          tenantId: tenant.id,
          module: 'GYM',
          planId: plan.id,
          status: subStatus as any,
          startDate: subStartDate,
          endDate: subEndDate,
        },
      });
    }
    console.log(
      `   - Attached ${subStatus} ${t.expectedPlan} subscription (Expires: ${subEndDate.toISOString().split('T')[0]})`,
    );
  }

  console.log('\n🎉 Production Test Ring setup complete!');
}

createTestTenants()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
