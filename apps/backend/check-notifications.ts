import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenantId = 'cmmeh97on000gleis5gibwf58';
  const logs = await prisma.notificationLog.findMany({
    where: { tenantId, channel: 'IN_APP' },
    orderBy: { createdAt: 'desc' },
  });

  console.log(`Found ${logs.length} IN_APP notifications for ${tenantId}`);
  for (const log of logs) {
    console.log(`- Event: ${log.eventId} | Status: ${log.status} | Created: ${log.createdAt}`);
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
