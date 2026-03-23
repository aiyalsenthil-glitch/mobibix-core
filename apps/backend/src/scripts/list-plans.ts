import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();


  try {
    const plans = await prisma.plan.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        isActive: true,
        isPublic: true,
      }
    });


    plans.forEach(p => {

    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
