import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const plan = await prisma.plan.findFirst({
    where: { code: 'MOBIBIX_PRO' }
  });

  if (plan) {
    await prisma.planPrice.updateMany({
      where: {
        planId: plan.id,
        billingCycle: 'YEARLY'
      },
      data: {
        REMOVED_PAYMENT_INFRAPlanId: 'plan_SNqgJbRSB1E0xz'
      }
    });
    console.log('Mapped MOBIBIX_PRO YEARLY to Test ID: plan_SNqgJbRSB1E0xz');
  } else {
    console.error('Plan MOBIBIX_PRO not found!');
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
