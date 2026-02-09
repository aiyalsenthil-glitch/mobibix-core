
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Connecting...');
  await prisma.$connect();
  console.log('Connected.');

  try {
    console.log('Running query...');
    const result = await prisma.tenant.findMany({
      skip: 0,
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        subscription: {
          where: { status: 'ACTIVE' },
          include: { plan: true },
        },
        userTenants: {
          where: { role: 'OWNER' as UserRole }, // Explicit cast or string usage
          take: 1,
          include: { user: true },
        },
      },
    });
    console.log('Query successful. Rows:', result.length);
    console.log(JSON.stringify(result[0], null, 2));
  } catch (e) {
    console.error('Query failed:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
