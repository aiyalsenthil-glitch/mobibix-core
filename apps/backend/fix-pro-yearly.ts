import { PrismaClient, BillingCycle } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Correcting MOBIBIX_PRO YEARLY
  const proPlan = await prisma.plan.findUnique({ where: { code: 'MOBIBIX_PRO' } });
  if (proPlan) {
    await prisma.planPrice.updateMany({
      where: {
        planId: proPlan.id,
        billingCycle: BillingCycle.YEARLY,
      },
      data: {
        REMOVED_PAYMENT_INFRAPlanId: 'plan_SHBU6VWrCKq5m4'
      }
    });
    console.log('Fixed MOBIBIX_PRO YEARLY ID');
  }
}

main().finally(() => prisma.$disconnect());
