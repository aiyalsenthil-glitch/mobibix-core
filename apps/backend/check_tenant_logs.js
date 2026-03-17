
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const tenantId = 'cmmq3ijhj000otvykbu1xmpu7';
  const logs = await prisma.whatsAppMessageLog.findMany({
    where: { tenantId },
    distinct: ['phoneNumber'],
    select: { phoneNumber: true }
  });
  console.log('Unique phone numbers:', logs.map(l => l.phoneNumber));
  
  const allLogs = await prisma.whatsAppMessageLog.count({ where: { tenantId } });
  console.log('Total logs for tenant:', allLogs);
}

check().catch(console.error).finally(() => prisma.$disconnect());
