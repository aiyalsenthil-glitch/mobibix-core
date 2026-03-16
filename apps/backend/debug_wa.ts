import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  console.log('--- WhatsApp Numbers ---');
  const numbers = await prisma.whatsAppNumber.findMany({
    select: { id: true, tenantId: true, phoneNumber: true, provider: true, isEnabled: true, isDefault: true }
  });
  console.log(JSON.stringify(numbers, null, 2));
  
  console.log('--- Current Tenant ID in logs ---');
  const logs = await prisma.whatsAppLog.findMany({ take: 5, orderBy: { sentAt: 'desc' } });
  console.log('Recent logs tenants:', logs.map(l => l.tenantId));
}
main().finally(() => prisma.$disconnect());
