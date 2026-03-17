const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function call(){
  const tenantId = 'cmmq3ijhj000otvykbu1xmpu7';
  const logs = await p.whatsAppMessageLog.findMany({
    where: { tenantId }
  });
  console.log(`FOUND ${logs.length} logs for tenant ${tenantId}`);
  logs.forEach(l => {
    console.log(`- ID: ${l.id}, Phone: ${l.phoneNumber}, JID: ${l.jid}, Created: ${l.createdAt}`);
  });
}
call().finally(() => p.$disconnect());
