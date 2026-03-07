
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const plans = await prisma.plan.findMany({
    where: { module: 'MOBILE_SHOP' },
    select: { id: true, code: true, name: true }
  });
  console.log('Mobile Shop Plans:', JSON.stringify(plans, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
