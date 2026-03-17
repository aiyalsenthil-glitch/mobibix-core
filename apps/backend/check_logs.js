const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const count = await prisma.whatsAppMessageLog.count();
    console.log(`Total WhatsAppMessageLog records: ${count}`);
    
    const logs = await prisma.whatsAppMessageLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5
    });
    
    logs.forEach(log => {
      console.log(`ID: ${log.id}, Phone: ${log.phoneNumber}, Direction: ${log.direction}, Body: ${log.body.substring(0, 20)}...`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
