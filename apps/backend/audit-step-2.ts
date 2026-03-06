import { PrismaClient, SubscriptionStatus, BillingType, AutopayStatus, ModuleType } from '@prisma/client';

const prisma = new PrismaClient();

async function step2() {
  const code = 'AUDIT_TENANT_001';
  console.log('--- Step 2: Subscription Creation Test ---');

  // Cleanup
  const existing = await prisma.tenant.findUnique({ where: { code }, select: { id: true } });
  if (existing) {
    await prisma.invoice.deleteMany({ where: { tenantId: existing.id } });
    await prisma.payment.deleteMany({ where: { tenantId: existing.id } });
    await prisma.tenantSubscription.deleteMany({ where: { tenantId: existing.id } });
    await prisma.tenant.delete({ where: { id: existing.id } });
  }

  // creation
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Audit Test Tenant',
      code,
      tenantType: 'MOBILE_SHOP',
      currency: 'INR'
    }
  });

  const sub = await prisma.tenantSubscription.create({
    data: {
      tenantId: tenant.id,
      planId: '387c7037-e4b1-4b9e-b39b-c0e2f5578a0e', // TEST_DAILY
      module: ModuleType.MOBILE_SHOP,
      status: SubscriptionStatus.ACTIVE,
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      billingCycle: 'MONTHLY',
      priceSnapshot: 50000,
      providerSubscriptionId: 'sub_AUDIT_RZP_001',
      autopayStatus: AutopayStatus.ACTIVE
    }
  });

  console.log('✅ Subscription Created:', sub.id);
  console.log('   Status:', sub.status);
  console.log('   EndDate:', sub.endDate);

  // Check unique active sub
  const duplicates = await prisma.tenantSubscription.count({
    where: { tenantId: tenant.id, module: ModuleType.MOBILE_SHOP, status: SubscriptionStatus.ACTIVE }
  });

  if (duplicates === 1) {
    console.log('✅ Unique Active Protection verified.');
  } else {
    console.error('❌ Duplicate ACTIVE subscriptions found!');
  }
}

step2().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
