const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const logs = await prisma.whatsAppMessageLog.findMany({ select: { phoneNumber: true }, take: 20 });
  console.log('Logs:', JSON.stringify(logs, null, 2));
}
run().catch(console.error).finally(() => prisma.$disconnect());
