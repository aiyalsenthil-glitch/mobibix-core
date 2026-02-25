import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  const counts = await prisma.loyaltyTransaction.groupBy({
    by: ['customerId'],
    _sum: {
      points: true,
    },
    _count: {
      _all: true,
    }
  });

  const output = {
    summary: counts,
    latest: await prisma.loyaltyTransaction.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
    }),
    customers: await prisma.party.findMany({
      where: { id: { in: counts.map(c => c.customerId) } },
      select: { id: true, name: true }
    })
  };

  fs.writeFileSync('loyalty-diag.json', JSON.stringify(output, null, 2));
  console.log('Diagnostic data saved to loyalty-diag.json');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
