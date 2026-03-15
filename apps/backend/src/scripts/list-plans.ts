import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  console.log('📋 Listing all Plans in Database...');

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

    console.log(`📊 Found ${plans.length} plans total.`);
    plans.forEach(p => {
      console.log(`- [${p.id}] CODE: ${p.code} | NAME: ${p.name} | ACTIVE: ${p.isActive} | PUBLIC: ${p.isPublic}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
