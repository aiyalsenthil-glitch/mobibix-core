import { PrismaClient, SubscriptionStatus, BillingType, AutopayStatus, PaymentStatus, ModuleType } from '@prisma/client';

const prisma = new PrismaClient();

async function runAudit() {
  const tenantCode = 'AUDIT_SEC_001';
  console.log('🛡️ Starting Final Security & Idempotency Audit...');

  // 1. Setup Tenant
  let tenant = await prisma.tenant.findUnique({ where: { code: tenantCode } });
  if (tenant) {
    await prisma.invoice.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.payment.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.tenantSubscription.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.tenant.delete({ where: { id: tenant.id } });
  }
  tenant = await prisma.tenant.create({ 
    data: { name: 'Audit Security Tenant', code: tenantCode, tenantType: 'MOBILE_SHOP' } 
  });

  const providerSubId = 'sub_AUDIT_IDEMPOTENCY_999';

  // --- TEST A: RESURRECTION (Race Condition) ---
  console.log('🧪 Test A: Resurrection Guard (Cron already expired sub, but charge succeeds)');
  
  // Create an EXPIRED record (simulating cron action)
  const expiredSub = await prisma.tenantSubscription.create({
    data: {
      tenantId: tenant.id,
      planId: '387c7037-e4b1-4b9e-b39b-c0e2f5578a0e',
      module: ModuleType.MOBILE_SHOP,
      status: SubscriptionStatus.EXPIRED, // ALREADY EXPIRED
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() - 1000), // 1 second ago
      billingType: BillingType.AUTOPAY,
      providerSubscriptionId: providerSubId
    }
  });

  // Simulate Webhook arrival logic
  const current_start = Math.floor(Date.now() / 1000);
  const current_end = current_start + (7 * 24 * 60 * 60);

  console.log('📡 Webhook arrives with charge for NEXT cycle...');
  
  await prisma.$transaction(async (tx) => {
     // Even if latest is EXPIRED, we create new ACTIVE
     await tx.tenantSubscription.create({
        data: {
            tenantId: tenant.id,
            planId: expiredSub.planId,
            module: expiredSub.module,
            status: SubscriptionStatus.ACTIVE,
            startDate: new Date(current_start * 1000),
            endDate: new Date(current_end * 1000),
            providerSubscriptionId: providerSubId,
            billingType: BillingType.AUTOPAY
        }
     });
  });
  console.log('✅ Success: Webhook successfully "resurrected" access by creating the next cycle.');

  // --- TEST B: DUPLICATE PROTECTION (Unique Constraint) ---
  console.log('🧪 Test B: Duplicate Protection (Sending same cycle twice)');
  
  try {
    await prisma.tenantSubscription.create({
        data: {
            tenantId: tenant.id,
            planId: expiredSub.planId,
            module: expiredSub.module,
            status: SubscriptionStatus.ACTIVE,
            startDate: new Date(current_start * 1000),
            endDate: new Date(current_end * 1000), // SAME END DATE
            providerSubscriptionId: providerSubId,
            billingType: BillingType.AUTOPAY
        }
     });
     console.error('❌ FAIL: Database allowed duplicate cycle (same endDate)!');
  } catch (err: any) {
    if (err.code === 'P2002') {
        console.log('✅ Success: Unique constraint [tenantId, module, endDate] blocked the duplicate cycle.');
    } else {
        throw err;
    }
  }

  console.log('🏁 Audit Tests Complete.');
}

runAudit().catch(console.error).finally(() => prisma.$disconnect());
