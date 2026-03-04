import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const tID = 'cmma9erwa0001j1s4d8pcn1ro'; // Tenant B
  
  const shop = await prisma.shop.findFirst({ where: { tenantId: tID } });
  if (shop) return console.log(`RESOURCE_ID=${shop.id}&TYPE=shop`);

  const member = await prisma.member.findFirst({ where: { tenantId: tID } });
  if (member) return console.log(`RESOURCE_ID=${member.id}&TYPE=member`);

  const userTenant = await prisma.userTenant.findFirst({ where: { tenantId: tID } });
  if (userTenant) return console.log(`RESOURCE_ID=${userTenant.id}&TYPE=userTenant`);

  console.log('No resources found for Tenant B');
}

main().catch(console.error).finally(() => prisma.$disconnect());
