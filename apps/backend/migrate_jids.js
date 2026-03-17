const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrate() {
  console.log('🚀 Starting JID normalization migration...');
  
  const logs = await prisma.whatsAppMessageLog.findMany({
    select: { id: true, phoneNumber: true }
  });

  console.log(`Checking ${logs.length} logs...`);
  let updatedCount = 0;

  for (const log of logs) {
    const normalized = log.phoneNumber.split('@')[0].split(':')[0];
    if (normalized !== log.phoneNumber) {
      await prisma.whatsAppMessageLog.update({
        where: { id: log.id },
        data: { phoneNumber: normalized, metadata: { ... (log.metadata || {}), originalJid: log.phoneNumber } }
      });
      updatedCount++;
    }
  }

  console.log(`✅ Migration complete. Updated ${updatedCount} rows.`);
}

migrate().catch(console.error).finally(() => prisma.$disconnect());
