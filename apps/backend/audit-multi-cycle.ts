import { PrismaClient, SubscriptionStatus, BillingType, ModuleType } from '@prisma/client';

const prisma = new PrismaClient();

const WEEK = 7 * 24 * 60 * 60 * 1000;
const BASE_PLAN_ID = '387c7037-e4b1-4b9e-b39b-c0e2f5578a0e'; // TEST_DAILY
const PROVIDER_SUB_ID = 'sub_MULTI_CYCLE_TEST_001';
const TENANT_CODE = 'AUDIT_MULTI_001';

async function runMultiCycleTest() {
  console.log('🔄 Multi-Cycle Stress Test (10 Billing Cycles)\n');

  // Setup: clean + create tenant
  let tenant = await prisma.tenant.findUnique({ where: { code: TENANT_CODE } });
  if (tenant) {
    await prisma.payment.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.tenantSubscription.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.tenant.delete({ where: { id: tenant.id } });
  }
  tenant = await prisma.tenant.create({
    data: { name: 'Multi-Cycle Audit Tenant', code: TENANT_CODE, tenantType: 'MOBILE_SHOP' }
  });

  // Create initial subscription (Cycle 0)
  let currentSub = await prisma.tenantSubscription.create({
    data: {
      tenantId: tenant.id,
      planId: BASE_PLAN_ID,
      module: ModuleType.MOBILE_SHOP,
      status: SubscriptionStatus.ACTIVE,
      startDate: new Date(Date.now() - WEEK),
      endDate: new Date(Date.now() - 1000), // Already expired
      billingType: BillingType.AUTOPAY,
      providerSubscriptionId: PROVIDER_SUB_ID,
    }
  });

  console.log(`Cycle 0 created: ${currentSub.id} (seed - EXPIRED in DB)\n`);

  const CYCLES = 10;
  const cycleIds: string[] = [currentSub.id];
  let cycleStart = Math.floor(Date.now() / 1000);

  for (let i = 1; i <= CYCLES; i++) {
    const current_start = cycleStart;
    const current_end = cycleStart + 7 * 24 * 60 * 60;

    // Simulate webhook processing (atomic)
    const [, newSub] = await prisma.$transaction([
      // Expire the previous cycle
      prisma.tenantSubscription.update({
        where: { id: currentSub.id },
        data: { status: SubscriptionStatus.EXPIRED }
      }),
      // Create new ACTIVE cycle
      prisma.tenantSubscription.create({
        data: {
          tenantId: tenant.id,
          planId: BASE_PLAN_ID,
          module: ModuleType.MOBILE_SHOP,
          status: SubscriptionStatus.ACTIVE,
          startDate: new Date(current_start * 1000),
          endDate: new Date(current_end * 1000),
          billingType: BillingType.AUTOPAY,
          providerSubscriptionId: PROVIDER_SUB_ID,
          lastRenewedAt: new Date(),
        }
      }),
    ]);

    cycleIds.push(newSub.id);
    currentSub = newSub;
    cycleStart = current_end;

    const status = i === CYCLES ? 'ACTIVE ✅' : 'ACTIVE (will be expired next)';
    console.log(`Cycle ${i}: sub=${newSub.id.slice(-8)} | ${new Date(current_start * 1000).toDateString()} → ${new Date(current_end * 1000).toDateString()} | ${status}`);
  }

  // Data Integrity Audit
  console.log('\n--- Data Integrity Check ---');
  const allSubs = await prisma.tenantSubscription.findMany({
    where: { tenantId: tenant.id, providerSubscriptionId: PROVIDER_SUB_ID },
    orderBy: { startDate: 'asc' }
  });

  let passed = true;

  // Check: exactly (CYCLES) EXPIRED + 1 ACTIVE
  const expired = allSubs.filter(s => s.status === 'EXPIRED');
  const active = allSubs.filter(s => s.status === 'ACTIVE');

  if (expired.length === CYCLES && active.length === 1) {
    console.log(`✅ Status distribution: ${expired.length} EXPIRED, ${active.length} ACTIVE`);
  } else {
    console.error(`❌ Status mismatch: expected ${CYCLES} EXPIRED + 1 ACTIVE, got ${expired.length} EXPIRED + ${active.length} ACTIVE`);
    passed = false;
  }

  // Check: no duplicate endDates
  const endDates = allSubs.map(s => s.endDate.toISOString());
  const uniqueEndDates = new Set(endDates);
  if (uniqueEndDates.size === endDates.length) {
    console.log(`✅ No duplicate endDates (${endDates.length} unique cycles)`);
  } else {
    console.error(`❌ Duplicate endDates found!`);
    passed = false;
  }

  // Check: dates are sequential (no gaps)
  let sequential = true;
  for (let i = 1; i < allSubs.length; i++) {
    const prevEnd = allSubs[i - 1].endDate.getTime();
    const currStart = allSubs[i].startDate.getTime();
    if (Math.abs(prevEnd - currStart) > 1000) {
      console.error(`❌ Gap detected between cycle ${i-1} and ${i}!`);
      sequential = false;
      passed = false;
    }
  }
  if (sequential) console.log(`✅ Cycles are contiguous with no date gaps`);

  console.log(`\n${passed ? '🎉 Multi-Cycle Stress Test PASSED!' : '💥 Multi-Cycle Test FAILED'}`);
  console.log(`Total records: ${allSubs.length}`);
}

runMultiCycleTest().catch(console.error).finally(() => prisma.$disconnect());
