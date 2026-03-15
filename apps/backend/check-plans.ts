import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const plans = await prisma.plan.findMany({
    include: {
      planPrices: true,
    },
  });

  console.log('--- Plan Mappings ---');
  for (const plan of plans) {
    console.log(`Plan: ${plan.name} (${plan.id}) [Code: ${plan.code}]`);
    for (const price of plan.planPrices) {
      console.log(`  Cycle: ${price.billingCycle}, Price: ${price.price}, RazorpayPlanId: ${price.REMOVED_PAYMENT_INFRAPlanId || 'MISSING'}`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
