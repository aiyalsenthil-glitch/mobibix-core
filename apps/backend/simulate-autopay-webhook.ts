import { PrismaClient, SubscriptionStatus, BillingType, AutopayStatus, PaymentStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function simulateWebhook(subId: string, providerSubId: string) {
  console.log(`🚀 Simulating subscription.charged for sub: ${subId}`);
  
  const subscription = await prisma.tenantSubscription.findUnique({
    where: { id: subId }
  });

  if (!subscription) throw new Error('Sub not found');

  // Payload simulation
  const subEntity = {
    id: providerSubId,
    current_start: Math.floor(Date.now() / 1000),
    current_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60
  };
  const paymentEntity = {
    id: 'pay_simulated_' + Date.now(),
    amount: 49900,
    currency: 'INR',
    order_id: 'order_simulated_' + Date.now()
  };

  // Logic from RazorpayWebhookProcessor
  await prisma.$transaction(async (tx) => {
    // 1. Mark current as EXPIRED
    await tx.tenantSubscription.update({
      where: { id: subscription.id },
      data: {
        status: SubscriptionStatus.EXPIRED,
        updatedAt: new Date(),
      },
    });

    // 2. Create new record for the new cycle
    const renewed = await tx.tenantSubscription.create({
      data: {
        tenantId: subscription.tenantId,
        planId: subscription.planId,
        module: subscription.module,
        billingCycle: subscription.billingCycle || 'MONTHLY',
        priceSnapshot: subscription.priceSnapshot || 49900,
        autoRenew: true,
        status: SubscriptionStatus.ACTIVE,
        paymentStatus: PaymentStatus.SUCCESS,
        autopayStatus: AutopayStatus.ACTIVE,
        startDate: new Date(subEntity.current_start * 1000),
        endDate: new Date(subEntity.current_end * 1000),
        lastRenewedAt: new Date(),
        providerSubscriptionId: providerSubId,
        billingType: BillingType.AUTOPAY
      },
    });

    // 3. Create Payment
    await tx.payment.create({
      data: {
        tenantId: subscription.tenantId,
        planId: subscription.planId,
        module: subscription.module,
        billingCycle: subscription.billingCycle || 'MONTHLY',
        priceSnapshot: subscription.priceSnapshot || 49900,
        amount: paymentEntity.amount,
        currency: paymentEntity.currency,
        status: 'SUCCESS',
        provider: 'RAZORPAY',
        providerOrderId: paymentEntity.order_id,
        providerPaymentId: paymentEntity.id,
      },
    });

    console.log('✅ Cycle history maintained. New sub ID:', renewed.id);
  });
}

async function main() {
  const code = 'AUTOPAY_TEST_1';
  const tenant = await prisma.tenant.findUnique({ where: { code } });
  if (!tenant) throw new Error('Run setup-autopay-test.ts first');

  const sub = await prisma.tenantSubscription.findFirst({
    where: { tenantId: tenant.id, status: SubscriptionStatus.ACTIVE }
  });

  if (!sub) throw new Error('Active sub not found for test tenant');

  await simulateWebhook(sub.id, sub.providerSubscriptionId!);
}

main().catch(console.error).finally(() => prisma.$disconnect());
