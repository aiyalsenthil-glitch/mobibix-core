import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenantId = 'cmmq3ijhj000otvykbu1xmpu7';
  
  // 1. Check all numbers
  console.log('--- Current WhatsApp Numbers ---');
  const numbers = await prisma.whatsAppNumber.findMany({
    where: { tenantId }
  });
  console.dir(numbers, { depth: null });

  // 2. Ensure WEB_SOCKET number exists and is default
  const wsNumber = numbers.find(n => n.provider === 'WEB_SOCKET');
  
  if (!wsNumber) {
    console.log('Creating missing WEB_SOCKET number for tenant...');
    await prisma.whatsAppNumber.create({
      data: {
        tenantId,
        phoneNumber: 'PENDING',
        phoneNumberId: `WS_${tenantId}`,
        wabaId: 'WEB_SOCKET',
        provider: 'WEB_SOCKET',
        isEnabled: true,
        isDefault: true,
        setupStatus: 'ACTIVE',
        moduleType: 'MOBILE_SHOP'
      }
    });
    // Set others to non-default
    await prisma.whatsAppNumber.updateMany({
        where: { tenantId, provider: { not: 'WEB_SOCKET' } },
        data: { isDefault: false }
    });
  } else if (!wsNumber.isDefault) {
    console.log('Setting existing WEB_SOCKET number to default...');
    await prisma.whatsAppNumber.updateMany({
        where: { tenantId },
        data: { isDefault: false }
    });
    await prisma.whatsAppNumber.update({
        where: { id: wsNumber.id },
        data: { isDefault: true, isEnabled: true, setupStatus: 'ACTIVE' }
    });
  }

  console.log('--- Target Verified ---');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
