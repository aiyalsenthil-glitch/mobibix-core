import { PrismaClient, SubscriptionStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const ONE_HOUR = 60 * 60 * 1000;
  
  // 1. Ensure tenant
  let tenant = await prisma.tenant.findUnique({ where: { code: 'CRONTEST1' } });
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        name: 'Cron Test Tenant',
        code: 'CRONTEST1',
        tenantType: 'MOBILE_SHOP'
      }
    });
  }

  // 2. Ensure Plan
  let plan = await prisma.plan.findFirst({ where: { code: 'MOBIBIX_PRO' } });
  if (!plan) {
    plan = await prisma.plan.create({
      data: {
        code: 'MOBIBIX_PRO',
        name: 'MobiBix Pro',
        level: 2,
        module: 'MOBILE_SHOP',
        isActive: true,
        isPublic: true,
      }
    });
  }
  
  // Ensure default pricing is mapped (required by auto renew logic to grab the renewal price)
  await prisma.planPrice.upsert({
    where: { planId_billingCycle: { planId: plan.id, billingCycle: 'MONTHLY' } },
    update: { price: 49900 },
    create: { planId: plan.id, billingCycle: 'MONTHLY', price: 49900, isActive: true }
  });

  // 3. Clear old subs
  await prisma.tenantSubscription.deleteMany({
    where: { tenantId: tenant.id }
  });

  // 4. Create an expired "active" subscription (Needs to mimic auto-renew ready state)
  const expiringSub = await prisma.tenantSubscription.create({
    data: {
      tenantId: tenant.id,
      planId: plan.id,
      module: 'MOBILE_SHOP',
      status: SubscriptionStatus.ACTIVE,
      startDate: new Date(Date.now() - 30*24*ONE_HOUR),
      endDate: new Date(Date.now() - ONE_HOUR), // Expired an hour ago
      billingCycle: 'MONTHLY',
      priceSnapshot: 49900,
      autoRenew: true,
      providerSubscriptionId: null // Simulate manual/wallet that needs autorenew
    }
  });

  console.log('✅ Created expiring subscription:', expiringSub.id);
  console.log('⏳ Run `npx ts-node trigger-cron.ts` now to test the cron job.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
