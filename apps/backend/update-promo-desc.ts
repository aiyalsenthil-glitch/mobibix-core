import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.promoCode.update({
    where: { code: 'RG-MB-01' },
    data: { description: 'Repairguru Academy Promo: Pro Pack (90 Days)' },
  });
  console.log('Updated promo description');
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
