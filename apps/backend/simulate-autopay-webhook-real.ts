import { PrismaClient, SubscriptionStatus, BillingType, AutopayStatus, PaymentStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function simulateWebhook(providerSubId: string) {
  console.log(`🚀 Simulating subscription.charged for sub: ${providerSubId}`);
  
  // 1. Find the current subscription row in our DB
  const subscription = await prisma.tenantSubscription.findFirst({
    where: { providerSubscriptionId: providerSubId },
    orderBy: { createdAt: 'desc' }
  });

  if (!subscription) throw new Error('Sub not found in DB');

  // Payload simulation (using Razorpay's format)
  const subEntity = {
    id: providerSubId,
    current_start: Math.floor(Date.now() / 1000), // Today
    current_end: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60 // +1 week
  };
  const paymentEntity = {
    id: 'pay_simulated_' + Date.now(),
    amount: 50000,
    currency: 'INR',
    order_id: 'order_simulated_' + Date.now()
  };

  // Logic from RazorpayWebhookProcessor (direct test)
  await prisma.$transaction(async (tx) => {
    // 1. Mark current as EXPIRED
    await tx.tenantSubscription.update({
      where: { id: subscription.id },
      data: {
        status: SubscriptionStatus.EXPIRED,
        updatedAt: new Date(),
      },
    });

    const nextPlanId = subscription.nextPlanId || subscription.planId;
    const nextBillingCycle = subscription.nextBillingCycle || subscription.billingCycle || 'MONTHLY';
    const nextPriceSnapshot = subscription.nextPriceSnapshot ?? subscription.priceSnapshot;

    // 2. Create new record for the new cycle
    const renewed = await tx.tenantSubscription.create({
      data: {
        tenantId: subscription.tenantId,
        planId: nextPlanId,
        module: subscription.module,
        billingCycle: nextBillingCycle as any,
        priceSnapshot: nextPriceSnapshot,
        autoRenew: subscription.autoRenew,
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

    // 3. Create Payment record for audit
    await tx.payment.create({
      data: {
        tenantId: subscription.tenantId,
        planId: nextPlanId,
        module: subscription.module,
        billingCycle: nextBillingCycle as any,
        priceSnapshot: nextPriceSnapshot || 50000,
        amount: paymentEntity.amount,
        currency: paymentEntity.currency,
        status: 'SUCCESS',
        provider: 'RAZORPAY',
        providerOrderId: paymentEntity.order_id,
        providerPaymentId: paymentEntity.id,
      },
    });

    console.log('✅ Cycle history maintained.');
    console.log('✅ Previous Sub ID:', subscription.id, '(EXPIRED)');
    console.log('✅ New Sub ID:', renewed.id, '(ACTIVE)');
    console.log('📅 New Period:', renewed.startDate.toISOString(), 'to', renewed.endDate.toISOString());
  });
}

async function main() {
  const providerSubId = 'sub_SNvxABC_TEST_001'; 
  await simulateWebhook(providerSubId);
}

main().catch(console.error).finally(() => prisma.$disconnect());
