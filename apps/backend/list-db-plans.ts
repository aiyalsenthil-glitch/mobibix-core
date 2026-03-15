import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const plans = await prisma.plan.findMany({
    include: { planPrices: true }
  });

  console.log('Current Plans in DB:');
  for (const p of plans) {
    console.log(`\nPlan: ${p.name} (Code: ${p.code})`);
    for (const pr of p.planPrices) {
      console.log(`  - Cycle: ${pr.billingCycle} | Price: ${pr.price}`);
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
