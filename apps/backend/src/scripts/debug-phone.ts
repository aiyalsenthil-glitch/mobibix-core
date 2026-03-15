import { PrismaClient, ModuleType } from '@prisma/client';

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

  // 2. Check All Relevant Phone Numbers (Tenant-specific OR Module-shared)
  const moduleType = (tenant.tenantType as ModuleType) ?? ModuleType.GYM;
  console.log(
    `Checking All Numbers for Tenant: ${tenantId} and Module: ${moduleType}`,
  );

  const allPhones = await prisma.whatsAppNumber.findMany({
    where: {
      OR: [{ tenantId }, { tenantId: null, moduleType: moduleType }],
    },
  });
  console.log(
    'Phone Numbers Found:',
    allPhones.map((p) => ({
      id: p.id,
      tenant: p.tenantId ? 'SPECIFIC' : 'SHARED',
      phone: p.phoneNumber,
      purpose: p.purpose,
      isDefault: p.isDefault,
      isEnabled: p.isEnabled,
    })),
  );

  // 3. Simulate Resolution Logic
  console.log('--- Resolution Simulation ---');

  // A. Tenant Specific (REMINDER)
  const tSpecific = allPhones.find(
    (p) => p.tenantId === tenantId && p.purpose === 'REMINDER' && p.isEnabled,
  );
  console.log('Tenant Specific (REMINDER):', tSpecific ? 'FOUND' : 'NOT FOUND');

  // B. Tenant Default
  const tDefault = allPhones.find(
    (p) => p.tenantId === tenantId && p.isDefault && p.isEnabled,
  );
  console.log('Tenant Default:', tDefault ? 'FOUND' : 'NOT FOUND');

  // C. Module Specific (REMINDER)
  const mSpecific = allPhones.find(
    (p) =>
      p.tenantId === null &&
      p.moduleType === moduleType &&
      p.purpose === 'REMINDER' &&
      p.isEnabled,
  );
  console.log('Module Specific (REMINDER):', mSpecific ? 'FOUND' : 'NOT FOUND');

  // D. Module Default
  const mDefault = allPhones.find(
    (p) =>
      p.tenantId === null &&
      p.moduleType === moduleType &&
      p.isDefault &&
      p.isEnabled,
  );
  console.log('Module Default:', mDefault ? 'FOUND' : 'NOT FOUND');
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
