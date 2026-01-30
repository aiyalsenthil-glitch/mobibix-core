require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Starting seeding module defaults into tenants...');

  const modules = await prisma.whatsAppPhoneNumberModule.findMany({ where: { isActive: true } });
  if (!modules.length) {
    console.log('No active module defaults found; exiting.');
    return;
  }

  const tenants = await prisma.tenant.findMany({ select: { id: true, code: true } });
  console.log(`Found ${tenants.length} tenants and ${modules.length} module defaults`);

  let totalCreated = 0;
  let tenantsSkipped = 0;

  for (const t of tenants) {
    const existing = await prisma.whatsAppPhoneNumber.findFirst({ where: { tenantId: t.id } });
    if (existing) {
      tenantsSkipped += 1;
      continue;
    }

    const data = modules.map(m => ({
      tenantId: t.id,
      phoneNumber: m.phoneNumber,
      phoneNumberId: m.phoneNumberId,
      wabaId: m.wabaId,
      purpose: m.purpose,
      qualityRating: m.qualityRating,
      isDefault: m.isDefault,
      isActive: m.isActive
    }));

    try {
      const res = await prisma.whatsAppPhoneNumber.createMany({ data, skipDuplicates: true });
      totalCreated += res.count || data.length;
      console.log(`Seeded ${res.count || data.length} numbers for tenant ${t.code} (${t.id})`);
    } catch (err) {
      console.error(`Failed to seed tenant ${t.code} (${t.id}):`, err.message || err);
    }
  }

  console.log(`Seeding complete. Created ~${totalCreated}. Tenants skipped (already had numbers): ${tenantsSkipped}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
