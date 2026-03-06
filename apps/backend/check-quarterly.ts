import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const prices = await prisma.planPrice.findMany({
    where: { billingCycle: 'QUARTERLY' },
    include: { plan: true }
  });

  console.log('Quarterly Prices in DB:');
  for (const p of prices) {
    console.log(`- Plan: ${p.plan.name} | Active: ${p.isActive} | RZP_ID: ${p.REMOVED_PAYMENT_INFRAPlanId}`);
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
