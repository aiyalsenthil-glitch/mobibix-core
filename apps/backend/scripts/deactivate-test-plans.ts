import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.plan.updateMany({
    where: {
      code: 'TEST_DAILY',
    },
    data: {
      isActive: false,
      isPublic: false,
    },
  });

  console.log(`Deactivated ${result.count} test plans.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
