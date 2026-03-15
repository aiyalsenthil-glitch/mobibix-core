import Razorpay from 'REMOVED_PAYMENT_INFRA';
import * as dotenv from 'dotenv';
import { PrismaClient, SubscriptionStatus, BillingType, AutopayStatus } from '@prisma/client';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const code = 'AUTOPAY_REAL_TEST';
  console.log('🧪 Setting up Real Lifecycle Test for AutoPay...');

  try {
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
        name: 'AutoPay Real Test Tenant',
        code,
        tenantType: 'MOBILE_SHOP'
      }
    });

    // 3. Create active subscription with our new test plan
    const sub = await prisma.tenantSubscription.create({
      data: {
        tenantId: tenant.id,
        planId: '387c7037-e4b1-4b9e-b39b-c0e2f5578a0e', // From create-one-day-plan.ts
        module: 'MOBILE_SHOP',
        status: SubscriptionStatus.ACTIVE,
        startDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), 
        endDate: new Date(Date.now() - 60 * 1000), // Expired 1 minute ago correctly for Cron to pick if not filtered
        billingCycle: 'MONTHLY',
        priceSnapshot: 50000,
        autoRenew: true,
        billingType: BillingType.AUTOPAY,
        providerSubscriptionId: 'sub_SNvxABC_TEST_001', 
        autopayStatus: AutopayStatus.ACTIVE,
        lastRenewedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      }
    });

    console.log('✅ Created expired AutoPay subscription row:', sub.id);
    console.log('🕒 Running cron now to verify it handles only MANUAL subs.');
    
  } catch (error: any) {
    console.error('❌ Setup failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
