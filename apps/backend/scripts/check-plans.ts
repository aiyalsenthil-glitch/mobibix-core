
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const plans = await prisma.plan.findMany({
    where: {
      planPrices: {
        some: {
          price: 4599,
        },
      },
    },
    include: {
      planPrices: true,
    },
  });
  console.log('4599 PLANS:', JSON.stringify(plans, null, 2));

  const user = await prisma.user.findFirst({
    where: { email: 'senthilsfour@gmail.com' },
    select: {
      tenantId: true,
      email: true,
    },
  });
  console.log('USER:', JSON.stringify(user, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
