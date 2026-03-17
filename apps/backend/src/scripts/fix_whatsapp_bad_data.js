const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Robust Data Fix Script
 * 1. Populates the new 'jid' column from metadata
 * 2. Re-normalizes 'phoneNumber' from the actual JID
 * 3. Handles cases where message IDs were incorrectly stored as phone numbers
 */
async function fixData() {
  console.log('🚀 Starting WhatsApp data cleanup...');
  
  const logs = await prisma.whatsAppMessageLog.findMany();

  console.log(`Analyzing ${logs.length} logs...`);
  let fixedCount = 0;
  let jidPopulated = 0;

  for (const log of logs) {
    let updateData = {};
    let currentJid = log.jid;

    // 1. Populate jid if missing, using metadata.jid
    if (!currentJid && log.metadata && typeof log.metadata === 'object' && log.metadata.jid) {
      currentJid = log.metadata.jid;
      updateData.jid = currentJid;
      jidPopulated++;
    }

    // 2. If we have a JID, ensure phoneNumber is correctly extracted from it
    if (currentJid) {
      const extractedPhone = currentJid.split('@')[0].split(':')[0];
      if (extractedPhone !== log.phoneNumber) {
        // If it was one of those long random IDs (like 122733186789409)
        if (log.phoneNumber.length > 15 || log.phoneNumber.includes('-')) {
          console.log(`Fixing bad identifier: ${log.phoneNumber} -> ${extractedPhone}`);
        }
        updateData.phoneNumber = extractedPhone;
      }
    }

    // 3. Perform update if any changes detected
    if (Object.keys(updateData).length > 0) {
      await prisma.whatsAppMessageLog.update({
        where: { id: log.id },
        data: updateData
      });
      fixedCount++;
    }
  }

  console.log(`✅ Summary:`);
  console.log(`- Total logs analyzed: ${logs.length}`);
  console.log(`- JID column populated for: ${jidPopulated} rows`);
  console.log(`- Phone numbers corrected for: ${fixedCount} rows`);
}

fixData()
  .catch((err) => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
