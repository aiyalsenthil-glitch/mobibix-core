import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const code = 'RG-MB-01';
  const promo = await prisma.promoCode.findUnique({ where: { code } });
  if (!promo) {
    console.log('Promo code not found');
    return;
  }

  const tenants = await prisma.tenant.findMany({
    where: { promoCodeId: promo.id },
    include: {
      userTenants: { include: { user: true } },
      subscription: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  for (const t of tenants) {
    console.log(`Tenant: ${t.name} (${t.id})`);
    console.log(`Created At: ${t.createdAt}`);
    for (const s of t.subscription) {
      console.log(`  Sub: ${s.module} - Status: ${s.status} - EndDate: ${s.endDate}`);
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
