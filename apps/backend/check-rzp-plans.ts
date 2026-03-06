import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const prices = await prisma.planPrice.findMany({
    where: { REMOVED_PAYMENT_INFRAPlanId: { not: null } },
    include: { plan: true }
  });

  console.log('Plans with Razorpay IDs:');
  for (const p of prices) {
    console.log(`- Plan: ${p.plan.name} | Cycle: ${p.billingCycle} | RZP_ID: ${p.REMOVED_PAYMENT_INFRAPlanId}`);
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
