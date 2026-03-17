
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const plan = await prisma.plan.findFirst({
    where: { code: 'WA_OFFICIAL_BUSINESS' },
  });
  console.log('PLAN ID:', plan?.id);
  console.log('PLAN MODULE:', plan?.module);

  const user = await prisma.user.findFirst({
    where: { email: 'senthilsfour@gmail.com' },
  });
  console.log('USER TENANT ID:', user?.tenantId);
}
main().finally(() => prisma.$disconnect());
