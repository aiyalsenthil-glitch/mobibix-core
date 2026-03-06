import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenantId = 'cmmeh97on000gleis5gibwf58';
  const sub = await prisma.tenantSubscription.findFirst({
    where: {
      tenantId,
      module: 'MOBILE_SHOP',
      status: { in: ['ACTIVE', 'TRIAL'] }
    },
  });
  if (sub) {
    await prisma.tenantSubscription.update({
      where: { id: sub.id },
      data: { autoRenew: false },
    });
  }
  console.log('Disabled auto-renewal for ' + tenantId);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
