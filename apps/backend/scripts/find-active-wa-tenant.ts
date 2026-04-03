/**
 * Script: find-active-whatsapp-tenant.ts
 * Purpose: Find the production tenant with active WhatsApp + their WABA config
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

async function main() {
  const numbers = await prisma.whatsAppNumber.findMany({
    where: {
      isEnabled: true,
      tenantId: { not: null },
      provider: 'META_CLOUD',
    },
    select: {
      id: true,
      tenantId: true,
      phoneNumber: true,
      displayNumber: true,
      wabaId: true,
      phoneNumberId: true,
      setupStatus: true,
      capiDatasetId: true,
      capiAccessToken: true,
    },
  });

  console.log('\n=== Active WhatsApp Numbers (META_CLOUD, tenanted) ===\n');
  numbers.forEach((n) => {
    console.log(`Tenant:        ${n.tenant?.name} (${n.tenantId})`);
    console.log(`Module:        ${n.tenant?.moduleType}`);
    console.log(`Phone:         ${n.displayNumber || n.phoneNumber}`);
    console.log(`phoneNumberId: ${n.phoneNumberId}`);
    console.log(`wabaId:        ${n.wabaId}`);
    console.log(`setupStatus:   ${n.setupStatus}`);
    console.log(`CAPI Dataset:  ${n.capiDatasetId || '❌ not set'}`);
    console.log(`CAPI Token:    ${n.capiAccessToken ? '✅ set' : '❌ not set'}`);
    console.log(`WA Number ID:  ${n.id}`);
    console.log('─'.repeat(60));
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
