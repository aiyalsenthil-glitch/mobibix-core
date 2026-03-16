import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const tenantId = 'cmmq3ijhj000otvykbu1xmpu7';
  
  // Find the record with null tenant or just update it
  console.log('Patching WhatsApp record...');
  const result = await prisma.whatsAppNumber.updateMany({
    where: { 
      OR: [
        { tenantId: null },
        { phoneNumber: '++918667551566' }
      ]
    },
    data: {
      tenantId: tenantId,
      provider: 'WEB_SOCKET', // Ensure it matches what the controller expects
      isEnabled: true,
      isDefault: true,
      setupStatus: 'ACTIVE'
    }
  });
  
  console.log('Update result:', result);
  
  const numbers = await prisma.whatsAppNumber.findMany({ where: { tenantId } });
  console.log('Current numbers for tenant:', JSON.stringify(numbers, null, 2));
}
main().finally(() => prisma.$disconnect());
