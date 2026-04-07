import { PrismaClient, SubscriptionStatus, BillingType, ModuleType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const code = 'AUTOPAY_TEST_1';
  
  // 1. Cleanup
  const oldTenants = await prisma.tenant.findMany({ where: { code }, select: { id: true } });
  const oldIds = oldTenants.map(t => t.id);
  await prisma.invoice.deleteMany({ where: { tenantId: { in: oldIds } } });
  await prisma.payment.deleteMany({ where: { tenantId: { in: oldIds } } });
  await prisma.tenantSubscription.deleteMany({ where: { tenantId: { in: oldIds } } });
  await prisma.tenant.deleteMany({ where: { code } });

  // 2. Create Tenant
  const tenant = await prisma.tenant.create({
    data: {
      name: 'AutoPay Test Tenant',
      code,
      tenantType: 'MOBILE_SHOP'
    }
  });

  // 3. Find Plan
  const plan = await prisma.plan.findFirst({ where: { code: 'MOBIBIX_PRO' } });
  if (!plan) throw new Error('Plan MOBIBIX_PRO not found. Run seed first.');

  // 4. Create Active AutoPay Subscription
  const sub = await prisma.tenantSubscription.create({
    data: {
      tenantId: tenant.id,
      planId: plan.id,
      module: 'MOBILE_SHOP',
      status: SubscriptionStatus.ACTIVE,
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() - 1000), // Expired 1 second ago
      billingCycle: 'MONTHLY',
      priceSnapshot: 49900,
      autoRenew: true,
      billingType: BillingType.AUTOPAY, // This is key
      providerSubscriptionId: 'sub_test_12345', // Dummy Razorpay ID
      autopayStatus: 'ACTIVE' as any
    }
  });

  console.log('✅ Created AutoPay test subscription:', sub.id);
  console.log('📜 Billing Type:', sub.billingType);
  console.log('📅 End Date:', sub.endDate?.toISOString());
  console.log('🚀 Ready to test cron behavior.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
