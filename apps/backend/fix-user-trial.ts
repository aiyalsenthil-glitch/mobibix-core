import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenantId = 'cmmeh97on000gleis5gibwf58';
  
  // Extend to 90 days from creation
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) return;

  const newEndDate = new Date(tenant.createdAt);
  newEndDate.setDate(newEndDate.getDate() + 90);

  const sub = await prisma.tenantSubscription.findFirst({
    where: {
      tenantId,
      module: 'MOBILE_SHOP',
      status: { in: ['ACTIVE', 'TRIAL'] }
    },
  });

  if (sub) {
    const updated = await prisma.tenantSubscription.update({
      where: { id: sub.id },
      data: {
        endDate: newEndDate,
        status: 'ACTIVE', // Also set to ACTIVE as per the fix
      },
    });
    console.log(`Updated subscription for ${tenantId}. New EndDate: ${updated.endDate}`);
  } else {
    console.log(`No active subscription found for ${tenantId}.`);
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
