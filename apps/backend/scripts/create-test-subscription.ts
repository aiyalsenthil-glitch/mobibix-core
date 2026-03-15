import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Your tenant ID from the error
  const tenantId = 'cml7mgvuy00008klefqqqoczl';

  // 1. Get MOBILE_SHOP plan
  const plan = await prisma.plan.findFirst({
    where: { module: 'MOBILE_SHOP' },
  });

  if (!plan) {
    console.error('❌ No MOBILE_SHOP plan found. Create one first.');
    process.exit(1);
  }

  console.log(`✅ Found plan: ${plan.id} (${plan.description})`);

  // 2. Check if subscription already exists
  const existingSubscription = await prisma.tenantSubscription.findFirst({
    where: {
      tenantId,
      module: 'MOBILE_SHOP',
    },
  });

  if (existingSubscription) {
    console.log(`✅ Subscription already exists: ${existingSubscription.id}`);
    console.log(`   Status: ${existingSubscription.status}`);
    if (existingSubscription.status !== 'ACTIVE') {
      // Update to ACTIVE
      await prisma.tenantSubscription.update({
        where: { id: existingSubscription.id },
        data: {
          status: 'ACTIVE',
          endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      });
      console.log(`   Updated to ACTIVE`);
    }
    process.exit(0);
  }

  // 3. Create new subscription
  const subscription = await prisma.tenantSubscription.create({
    data: {
      tenantId,
      planId: plan.id,
      module: 'MOBILE_SHOP',
      billingCycle: 'MONTHLY',
      status: 'ACTIVE',
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
    },
  });

  console.log(`✅ Created subscription: ${subscription.id}`);
  console.log(`   Tenant: ${subscription.tenantId}`);
  console.log(`   Module: ${subscription.module}`);
  console.log(`   Status: ${subscription.status}`);
  console.log(`   Valid until: ${subscription.endDate}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
