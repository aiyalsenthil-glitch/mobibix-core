const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function call(){
  const count = await p.whatsAppMessageLog.count();
  console.log('TOTAL_LOGS:', count);
  
  const samples = await p.whatsAppMessageLog.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' }
  });
  console.log('LATEST_SAMPLES:', JSON.stringify(samples.map(s => ({ id: s.id, phone: s.phoneNumber, jid: s.jid })), null, 2));

  const corrupted = await p.whatsAppMessageLog.findMany({
    where: {
      OR: [
        { phoneNumber: { contains: '@' } },
        { phoneNumber: { contains: ':' } },
        { id: { contains: '122733' } }
      ]
    }
  });
  console.log('CORRUPTED_MATCHES:', corrupted.length);
}
call().finally(() => p.$disconnect());
