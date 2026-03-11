import { PrismaClient, ModuleType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const plans = await prisma.plan.findMany({
    where: {
      module: ModuleType.MOBILE_SHOP,
    },
    include: {
      planPrices: true,
    },
  });

  console.log(JSON.stringify(plans, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
