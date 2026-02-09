import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const CONNECTION_STRING = process.env.DATABASE_URL;

if (!CONNECTION_STRING) {
  throw new Error('DATABASE_URL is required to run this script');
}

async function main() {
  const adapter = new PrismaPg({ connectionString: CONNECTION_STRING });
  const prisma = new PrismaClient({ adapter } as any);

  console.log('--- Seeding Plan Features (no plan changes) ---');

  const planFeatureMap: Record<string, string[]> = {
    // GYM Plans: Premium features only
    TRIAL: [],
    BASIC: [],
    PLUS: [],
    PRO: ['REPORTS'],
    ULTIMATE: ['REPORTS'],

    // MOBIBIX Plans: Premium features only
    MOBIBIX_TRIAL: [],
    MOBIBIX_STANDARD: [],
    MOBIBIX_PRO: [
      'REPORTS',
      'CUSTOM_PRINT_LAYOUT',
      'MULTI_SHOP',
      'WHATSAPP_ALERTS_AUTOMATION',
    ],

    // WhatsApp Add-on: No core features
    WHATSAPP_PROMO: [],
    WHATSAPP_PROMO_2999: [],
  };

  console.log('--- Removing duplicate PlanFeature rows (if any) ---');
  await prisma.$executeRawUnsafe(`
    WITH ranked AS (
      SELECT id,
             ROW_NUMBER() OVER (PARTITION BY "planId", "feature" ORDER BY id) AS rn
      FROM "PlanFeature"
    )
    DELETE FROM "PlanFeature"
    WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
  `);

  const plans = await prisma.plan.findMany({
    where: {
      OR: [
        { code: { in: Object.keys(planFeatureMap) } },
        { name: { in: Object.keys(planFeatureMap) } },
      ],
    },
  });

  for (const plan of plans) {
    const key = (plan.code || plan.name || '').toUpperCase();
    const featuresToSeed = planFeatureMap[key] ?? [];

    console.log(`\nPlan: ${plan.name} (${plan.id})`);
    for (const feature of featuresToSeed) {
      const existing = await prisma.planFeature.findFirst({
        where: { planId: plan.id, feature: feature as any },
      });

      if (existing) {
        console.log(`- [SKIP] ${feature} already exists.`);
      } else {
        await prisma.planFeature.create({
          data: { planId: plan.id, feature: feature as any },
        });
        console.log(`- [ADD] ${feature} added.`);
      }
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);
