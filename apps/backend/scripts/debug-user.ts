
import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  const user = await prisma.user.findFirst({
    where: { email: 'test@gmail.com' },
    include: {
      userTenants: {
        include: {
          tenant: true,
        },
      },
      adminUser: true,
    },
  });

  console.log('User:', JSON.stringify(user, null, 2));
  
  if (user && user.userTenants.length > 0) {
    const tenantId = user.userTenants[0].tenantId;
    const staff = await prisma.shopStaff.findMany({
      where: { userId: user.id, tenantId },
      include: { dynamicRole: true },
    });
    console.log('Staff Records:', JSON.stringify(staff, null, 2));
    const subscriptions = await prisma.tenantSubscription.findMany({
      where: { tenantId },
      include: { plan: true },
    });
    console.log('Subscriptions:', JSON.stringify(subscriptions, null, 2));
  }

  await prisma.$disconnect();
}

main();
