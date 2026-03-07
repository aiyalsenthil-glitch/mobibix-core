import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const plans = await prisma.plan.findMany({
    where: { OR: [{ code: 'MOBIBIX_PRO' }, { code: 'GYM_PRO' }] },
    select: { id: true, code: true, name: true, module: true }
  });
  console.log('Plans found:', JSON.stringify(plans, null, 2));
}

main().finally(() => prisma.$disconnect());
