const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Production-grade Data Cleanup Script
 * 1. Identifies corrupted phone numbers (length > 14 or non-numeric)
 * 2. Attempts recovery using the 'jid' column
 * 3. Deletes records that cannot be validated
 */
async function fixInvalidPhoneNumbers() {
  console.log('🚀 Starting deep cleanup of invalid WhatsApp phone numbers...');
  
  // Find potentially corrupted logs
  const logs = await prisma.whatsAppMessageLog.findMany();
  
  console.log(`Analyzing ${logs.length} logs for corruption...`);
  
  let fixedCount = 0;
  let deletedCount = 0;

  for (const log of logs) {
    const phone = log.phoneNumber;
    
    // Strict Validation Check (matches jid.util.ts)
    const isNumeric = /^\d+$/.test(phone);
    const isCorrupted = !isNumeric || phone.length < 8 || phone.length > 14;

    if (isCorrupted) {
      console.log(`[CORRUPTION_DETECTED] id: ${log.id}, phone: ${phone}, jid: ${log.jid}`);
      
      let recoveredPhone = null;
      
      // Attempt recovery if we have a JID
      if (log.jid) {
        const userPart = log.jid.split('@')[0];
        const cleanId = userPart.split(':')[0];
        
        if (/^\d+$/.test(cleanId) && cleanId.length >= 8 && cleanId.length <= 14) {
          recoveredPhone = cleanId;
        }
      }

      if (recoveredPhone) {
        console.log(`[RECOVERED] ${phone} -> ${recoveredPhone}`);
        await prisma.whatsAppMessageLog.update({
          where: { id: log.id },
          data: { phoneNumber: recoveredPhone }
        });
        fixedCount++;
      } else {
        console.log(`[DELETING] Irrecoverable invalid pattern: ${phone}`);
        await prisma.whatsAppMessageLog.delete({
          where: { id: log.id }
        });
        deletedCount++;
      }
    }
  }

  console.log(`✅ Deep Cleanup Summary:`);
  console.log(`- Total logs analyzed: ${logs.length}`);
  console.log(`- Records recovered: ${fixedCount}`);
  console.log(`- Corrupted records deleted: ${deletedCount}`);
}

fixInvalidPhoneNumbers()
  .catch((err) => {
    console.error('❌ Deep cleanup failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
