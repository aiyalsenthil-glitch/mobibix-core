import { PrismaClient } from '@prisma/client';

async function getTenant() {
  const prisma = new PrismaClient();
  const tenant = await prisma.tenant.findFirst({ select: { id: true } });
  console.log('TENANT_ID:', tenant?.id);
  await prisma.$disconnect();
}

getTenant();
