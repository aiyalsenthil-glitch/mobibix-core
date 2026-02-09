import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenantId = 'cml27zxln000094le74zxiqvs'; // User's tenant ID

  console.log(`Checking for Tenant: ${tenantId}`);

  // 1. Check Tenant Details
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, name: true, tenantType: true },
  });
  console.log('Tenant:', tenant);

  if (!tenant) return;

  // 2. Check Tenant Phone Numbers
  const tenantPhones = await prisma.whatsAppPhoneNumber.findMany({
    where: { tenantId },
  });
  console.log('Tenant Phone Numbers:', tenantPhones);

  // 3. Check Module Phone Numbers
  const moduleType =
    tenant.tenantType === 'MOBILE_SHOP'
      ? 'MOBILE_SHOP'
      : tenant.tenantType || 'GYM';
  console.log(
    `Checking Module Type: ${moduleType} (Raw: ${tenant.tenantType})`,
  );

  const modulePhones = await prisma.whatsAppPhoneNumberModule.findMany({
    where: { moduleType: moduleType as any },
  });
  console.log('Module Phone Numbers:', modulePhones);

  // 4. Simulate Resolution Logic
  console.log('--- Resolution Simulation ---');

  // A. Tenant Specific (REMINDER)
  const tSpecific = tenantPhones.find(
    (p) => p.purpose === 'REMINDER' && p.isActive,
  );
  console.log('Tenant Specific (REMINDER):', tSpecific ? 'FOUND' : 'NOT FOUND');

  // B. Tenant Default
  const tDefault = tenantPhones.find(
    (p) => (p.isDefault || p.purpose === 'DEFAULT') && p.isActive,
  );
  console.log('Tenant Default:', tDefault ? 'FOUND' : 'NOT FOUND');

  // C. Module Specific (REMINDER)
  const mSpecific = modulePhones.find(
    (p) => p.purpose === 'REMINDER' && p.isActive,
  );
  console.log('Module Specific (REMINDER):', mSpecific ? 'FOUND' : 'NOT FOUND');

  // D. Module Default
  const mDefault = modulePhones.find(
    (p) => (p.isDefault || p.purpose === 'DEFAULT') && p.isActive,
  );
  console.log('Module Default:', mDefault ? 'FOUND' : 'NOT FOUND');
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
