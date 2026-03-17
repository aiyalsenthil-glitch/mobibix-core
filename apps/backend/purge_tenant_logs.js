const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function call(){
  const tenantId = 'cmmq3ijhj000otvykbu1xmpu7';
  console.log('--- PURGING ALL WHATSAPP LOGS FOR TENANT ---');
  const deleted = await p.whatsAppMessageLog.deleteMany({
    where: { tenantId }
  });
  console.log('DELETED:', deleted.count);
}
call().finally(() => p.$disconnect());
