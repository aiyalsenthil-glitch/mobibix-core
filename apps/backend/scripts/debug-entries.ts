
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const shopId = 'cmmf1dbed000slevoyvirr5h4';
  const entries = await prisma.financialEntry.findMany({
    where: { shopId },
    take: 10,
    orderBy: { createdAt: 'desc' }
  });

  console.log('--- FINANCIAL ENTRIES FOR TECH SHOP ---');
  console.dir(entries, { depth: null });
}

main().finally(() => prisma.$disconnect());
