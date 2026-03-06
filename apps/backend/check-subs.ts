import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.tenant.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      subscription: {
        orderBy: { startDate: 'desc' }
      }
    }
  });

  for (const t of tenants) {
    console.log(`Tenant: ${t.name} (Code: ${t.code})`);
    for (const s of t.subscription) {
      console.log(`  - Sub: ${s.id} | Status: ${s.status} | AutoRenew: ${s.autoRenew} | EndDate: ${s.endDate}`);
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
