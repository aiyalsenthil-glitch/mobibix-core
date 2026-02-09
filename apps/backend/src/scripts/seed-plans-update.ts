import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load env from backend folder
dotenv.config({ path: 'apps/backend/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🚀 Starting Plan & Feature Update...');

  // Feature Sets
  const FEATURES_BASIC = [
    'MEMBERS_MANAGEMENT',
    'ATTENDANCE_MANAGEMENT',
    'QR_ATTENDANCE',
  ];
  const FEATURES_PLUS = [...FEATURES_BASIC, 'STAFF_MANAGEMENT'];
  const FEATURES_PRO = [
    ...FEATURES_PLUS,
    'REPORTS',
    'MEMBER_PAYMENT_TRACKING',
    'WHATSAPP_ALERTS_BASIC',
  ];
  const FEATURES_ULTIMATE = [...FEATURES_PRO, 'WHATSAPP_ALERTS_ALL'];

  // Plans
  const plans: any[] = [
    {
      code: 'TRIAL',
      name: 'TRIAL',
      level: 0,
      price: 0,
      durationDays: 14,
      memberLimit: 0,
      module: 'GYM',
      features: FEATURES_ULTIMATE, // Trial gets everything
    },
    {
      code: 'BASIC',
      name: 'BASIC',
      level: 1,
      price: 99,
      durationDays: 30,
      memberLimit: 50,
      module: 'GYM',
      features: FEATURES_BASIC,
    },
    {
      code: 'PLUS',
      name: 'PLUS',
      level: 2,
      price: 149,
      durationDays: 30,
      memberLimit: 100,
      module: 'GYM',
      features: FEATURES_PLUS,
    },
    {
      code: 'PRO',
      name: 'PRO',
      level: 3,
      price: 1999,
      durationDays: 365,
      memberLimit: 600,
      module: 'GYM',
      features: FEATURES_PRO,
    },
    {
      code: 'ULTIMATE',
      name: 'ULTIMATE',
      level: 4,
      price: 4999,
      durationDays: 365,
      memberLimit: 500,
      module: 'GYM',
      features: FEATURES_ULTIMATE,
    },
  ];

  // Re-map features to include legacy keys for Android compatibility
  // PRO (Basic Alerts) -> PAYMENT_DUE, REMINDER
  // ULTIMATE (All Alerts) -> WELCOME, EXPIRY

  const LEGACY_BASIC = ['PAYMENT_DUE', 'REMINDER'];
  const LEGACY_ALL = [...LEGACY_BASIC, 'WELCOME', 'EXPIRY'];

  // Update features with legacy keys explicitly for the relevant plans
  // Note: We access by index since we just defined the array above.
  // TRIAL
  plans[0].features = [...new Set([...plans[0].features, ...LEGACY_ALL])];
  // PRO
  plans[3].features = [...new Set([...plans[3].features, ...LEGACY_BASIC])];
  // ULTIMATE
  plans[4].features = [...new Set([...plans[4].features, ...LEGACY_ALL])];

  for (const p of plans) {
    // 1. Upsert Plan
    const existingPlan = await prisma.plan.findFirst({
      where: { name: p.name },
    });

    let planId = existingPlan?.id;

    if (existingPlan) {
      await prisma.plan.update({
        where: { id: existingPlan.id },
        data: {
          level: p.level,
        },
      });
      console.log(`✅ Updated Plan: ${p.name}`);
    } else {
      const created = await prisma.plan.create({
        data: {
          code: p.code,
          name: p.name,
          level: p.level,
          isActive: true,
          module: p.module,
        },
      });
      planId = created.id;
      console.log(`✅ Created Plan: ${p.name}`);
    }

    if (planId) {
      // 2. Sync Plan Features (The real table)
      // Remove all existing features to ensure exact match
      await prisma.planFeature.deleteMany({
        where: { planId },
      });

      if (p.features.length > 0) {
        await prisma.planFeature.createMany({
          data: p.features.map((f: string) => ({
            planId: planId,
            feature: f as any,
          })),
        });
        console.log(`   - Synced ${p.features.length} features for ${p.name}`);
      }
    }
  }

  console.log('✅ Plan Update Complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
