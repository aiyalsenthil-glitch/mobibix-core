import { PrismaClient, ModuleType } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  const plans = await prisma.plan.findMany({
    where: { module: ModuleType.MOBILE_SHOP },
    include: {
      planFeatures: true,
      planPrices: true,
    },
    orderBy: { level: 'asc' },
  });

  console.log(JSON.stringify(plans, null, 2));
  await prisma.$disconnect();
}

main().catch(console.error);
