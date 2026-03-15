import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenantId = 'cmmeh97on000gleis5gibwf58';
  const sub = await prisma.tenantSubscription.findFirst({
    where: { tenantId, module: 'MOBILE_SHOP' },
  });

  console.log('Subscription Details:');
  console.log(JSON.stringify(sub, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
