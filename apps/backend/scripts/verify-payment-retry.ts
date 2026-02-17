

import { PrismaClient, PaymentStatus, PaymentRetryStatus, BillingCycle } from '@prisma/client';
import { PaymentRetryService } from '../src/core/billing/payments/payment-retry.service';
import { Logger } from '@nestjs/common';
import * as dotenv from 'dotenv';

dotenv.config();

// Mock Logger to see output
Logger.overrideLogger(['log', 'error', 'warn', 'debug', 'verbose']);

async function main() {
  console.log('Environment Debug:', {
      hasDbUrl: !!process.env.DATABASE_URL,
      cwd: process.cwd()
  });

  const prisma = new PrismaClient();
  // Mock PrismaService (which extends PrismaClient)
  const paymentRetryService = new PaymentRetryService(prisma as any);

  console.log('🚀 Starting Payment Retry Verification...');

  try {
    // 1. Setup: Find a tenant and plan
    const tenant = await prisma.tenant.findFirst();
    const plan = await prisma.plan.findFirst();

    if (!tenant || !plan) {
      console.error('❌ No tenant or plan found. Please seed DB first.');
      return;
    }

    // 2. Create a FAILED Payment
    console.log('📝 Creating dummy FAILED payment...');
    const payment = await prisma.payment.create({
      data: {
        tenantId: tenant.id,
        planId: plan.id,
        billingCycle: BillingCycle.MONTHLY,
        priceSnapshot: 10000,
        amount: 10000,
        currency: 'INR',
        status: PaymentStatus.FAILED,
        provider: 'TEST_PROVIDER',
        providerOrderId: `order_${Date.now()}`,
        meta: { failureReason: 'Verification Test' },
      },
    });
    console.log(`✅ Created Payment: ${payment.id}`);

    // 3. Trigger Schedule Retry
    console.log('🔄 Scheduling Retry...');
    await paymentRetryService.scheduleRetry(payment.id);

    // 4. Verify Retry Created
    const retry1 = await prisma.paymentRetry.findFirst({
        where: { paymentId: payment.id }
    });

    if (!retry1) {
        throw new Error('❌ Retry record NOT created!');
    }
    console.log(`✅ Retry #1 Created: ${retry1.id} (Scheduled for: ${retry1.scheduledAt.toISOString()})`);

    // 5. Test Cron (Should NOT execute yet)
    console.log('⏳ Running Cron (Should verify it is too early)...');
    await paymentRetryService.handleCron();
    
    const retry1check = await prisma.paymentRetry.findUnique({ where: { id: retry1.id } });
    if (retry1check?.status !== PaymentRetryStatus.PENDING) {
        throw new Error('❌ Retry executed too early!');
    }
    console.log('✅ Cron correctly skipped future retry.');

    // 6. Fast-forward time (Update scheduledAt to past)
    console.log('⏩ Fast-forwarding time...');
    await prisma.paymentRetry.update({
        where: { id: retry1.id },
        data: { scheduledAt: new Date(Date.now() - 60000) } // 1 min ago
    });

    // 7. Test Cron (Should EXECUTE now)
    console.log('⏳ Running Cron (Should EXECUTE)...');
    await paymentRetryService.handleCron();

    // 8. Verify Execution
    const retry1final = await prisma.paymentRetry.findUnique({ where: { id: retry1.id } });
    if (retry1final?.status !== PaymentRetryStatus.PROCESSED) {
        throw new Error(`❌ Retry status mismatch: Expected PROCESSED, got ${retry1final?.status}`);
    }
    console.log('✅ Retry #1 Executed successfully.');

    // 9. Verify Next Retry Scheduled
    const retry2 = await prisma.paymentRetry.findFirst({
        where: { 
            paymentId: payment.id,
            retryCount: 2
        }
    });

    if (!retry2) {
        throw new Error('❌ Next retry (#2) NOT scheduled!');
    }
    console.log(`✅ Retry #2 Scheduled: ${retry2.id} (Scheduled for: ${retry2.scheduledAt.toISOString()})`);

    console.log('🎉 Verification Successful! Cleaning up...');
    
    // Cleanup
    await prisma.payment.delete({ where: { id: payment.id } });
    console.log('🧹 Cleanup complete.');

  } catch (err) {
    console.error('❌ Verification Failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
