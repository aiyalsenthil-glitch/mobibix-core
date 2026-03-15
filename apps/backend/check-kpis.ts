import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const data = await prisma.$queryRaw`SELECT * FROM admin_global_kpis`;
  console.log('Admin KPIs:', data);
}

main().catch(console.error).finally(() => prisma.$disconnect());
