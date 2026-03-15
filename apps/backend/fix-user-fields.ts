import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenantId = 'cmmeh97on000gleis5gibwf58';
  
  // Find the plan price for the current plan
  const sub = await prisma.tenantSubscription.findFirst({
    where: { tenantId, module: 'MOBILE_SHOP' },
    include: { plan: { include: { planPrices: true } } }
  });

  if (!sub) return;

  const monthlyPrice = sub.plan.planPrices.find(p => p.billingCycle === 'MONTHLY')?.price || 49900;

  await prisma.tenantSubscription.update({
    where: { id: sub.id },
    data: {
      billingCycle: 'MONTHLY',
      priceSnapshot: monthlyPrice,
      // Keep autoRenew as is
    },
  });

  console.log(`Updated user ${tenantId} with valid billing fields.`);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
