const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tenantId = process.argv[2];
  if (!tenantId) {
    console.error('Usage: node debug-subscription.js <tenantId>');
    process.exit(1);
  }

  const subscription = await prisma.tenantSubscription.findUnique({
    where: { tenantId },
    include: { plan: true },
  });

  const memberCount = await prisma.member.count({ where: { tenantId } });

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
