import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenantId = 'cmmeh97on000gleis5gibwf58';
  const userId = 'cmmeh97ni000eleis1v92sq0e'; // I need to verify this userId or just use null

  // Let's find the owner userId first
  const userTenant = await prisma.userTenant.findFirst({
    where: { tenantId, role: 'OWNER' }
  });

  if (!userTenant) {
     console.error("Owner not found");
     return;
  }

  const log = await prisma.notificationLog.create({
    data: {
      tenantId,
      userId: userTenant.userId,
      eventId: 'tenant.welcome',
      channel: 'IN_APP',
      recipient: userTenant.userId,
      status: 'SENT',
      payload: {
        message: 'Welcome to Repairguru Academy! Your 90-day Pro Pack is now active.',
        promoCode: 'RG-MB-01'
      }
    }
  });

  console.log(`Created test notification: ${log.id}`);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
