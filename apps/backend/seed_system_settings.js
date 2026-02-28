const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const flags = [
    { flag: 'REGISTRATION_OPEN', enabled: true, scope: 'GLOBAL' },
    { flag: 'MAINTENANCE_MODE', enabled: false, scope: 'GLOBAL' },
    { flag: 'BETA_AI_ENGINE', enabled: true, scope: 'GLOBAL', rolloutPercentage: 20 },
    { flag: 'NEW_BILLING_FLOW', enabled: false, scope: 'GLOBAL' },
    { flag: 'WHATSAPP_SANDBOX', enabled: true, scope: 'GLOBAL' },
  ];

  for (const f of flags) {
    const existing = await prisma.featureFlag.findFirst({
      where: {
        flag: f.flag,
        scope: f.scope,
        tenantId: null,
        shopId: null,
      }
    });

    if (existing) {
      await prisma.featureFlag.update({
        where: { id: existing.id },
        data: { enabled: f.enabled, rolloutPercentage: f.rolloutPercentage },
      });
    } else {
      await prisma.featureFlag.create({ data: f });
    }
  }

  // Seed some CORS origins
  const origins = [
    { origin: 'http://localhost_REPLACED:3000', label: 'Local Dev' },
    { origin: 'https://app.mobibix.in', label: 'Gympilot Prod' },
    { origin: 'https://app.REMOVED_DOMAIN', label: 'Mobibix Prod' },
  ];

  for (const o of origins) {
    await prisma.corsAllowedOrigin.upsert({
      where: { origin: o.origin },
      update: { label: o.label },
      create: { ...o, isEnabled: true },
    });
  }

  console.log('Seed system settings done!');
}


main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
