const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function main() {
  console.log('--- Loyalty Transaction Summary (JS) ---');
  
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
      take: 20,
      orderBy: { createdAt: 'desc' },
    })
  };

  fs.writeFileSync('loyalty-diag-js.json', JSON.stringify(output, null, 2));
  console.log('Diagnostic data saved to loyalty-diag-js.json');
  console.log('Unique customer IDs in transactions:', counts.length);
  counts.forEach(c => {
    console.log(`Customer: ${c.customerId}, Balance: ${c._sum.points}, Count: ${c._count._all}`);
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
