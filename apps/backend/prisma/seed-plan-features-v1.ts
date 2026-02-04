/**
 * ============================================================
 * SEED SCRIPT: Plan Features (V1 Clean)
 * ============================================================
 *
 * Purpose: Assign features to V1 plans.
 *          Single source of truth = PlanFeature table.
 *          NEVER write to plan.features JSON.
 *
 * Feature Assignments:
 *   TRIAL:
 *     - Everything (all features for demo)
 *   STANDARD:
 *     - MEMBERS_MANAGEMENT
 *     - ATTENDANCE_MANAGEMENT
 *     - QR_ATTENDANCE
 *     - STAFF_MANAGEMENT
 *   PRO:
 *     - All STANDARD features +
 *     - REPORTS
 *     - MEMBER_PAYMENT_TRACKING
 *     - WHATSAPP_ALERTS_BASIC
 *     - PAYMENT_DUE
 *     - REMINDER
 *   WHATSAPP_CRM:
 *     - WHATSAPP_ALERTS_ALL
 *     - WELCOME
 *     - EXPIRY
 *     - PAYMENT_DUE
 *     - REMINDER
 *
 * CRITICAL:
 *   - Features are STRICTLY from WhatsAppFeature enum
 *   - One entry per (planId, feature)
 *   - NO duplicates
 *   - NO writing to plan.features JSON
 *   - Operation is IDEMPOTENT (safe to run multiple times)
 *
 * Usage:
 *   npx ts-node -r dotenv/config prisma/seed-plan-features-v1.ts
 *
 * ============================================================
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * V1 Feature Assignments
 * Based on: WhatsAppFeature enum
 */
const V1_PLAN_FEATURES = {
  TRIAL: [
    // GYM Core
    'MEMBERS_MANAGEMENT',
    'ATTENDANCE_MANAGEMENT',
    'QR_ATTENDANCE',
    'STAFF_MANAGEMENT',
    'REPORTS',
    'MEMBER_PAYMENT_TRACKING',
    // WhatsApp
    'WHATSAPP_ALERTS_BASIC',
    'WHATSAPP_ALERTS_ALL',
    'PAYMENT_DUE',
    'REMINDER',
    'WELCOME',
    'EXPIRY',
  ],
  STANDARD: [
    'MEMBERS_MANAGEMENT',
    'ATTENDANCE_MANAGEMENT',
    'QR_ATTENDANCE',
    'STAFF_MANAGEMENT',
  ],
  PRO: [
    // Standard features
    'MEMBERS_MANAGEMENT',
    'ATTENDANCE_MANAGEMENT',
    'QR_ATTENDANCE',
    'STAFF_MANAGEMENT',
    // Pro features
    'REPORTS',
    'MEMBER_PAYMENT_TRACKING',
    'WHATSAPP_ALERTS_BASIC',
    'PAYMENT_DUE',
    'REMINDER',
  ],
  WHATSAPP_CRM: [
    'WHATSAPP_ALERTS_ALL',
    'WELCOME',
    'EXPIRY',
    'PAYMENT_DUE',
    'REMINDER',
  ],
};

async function seedPlanFeatures() {
  console.log('🎯 V1 Plan Features Seeder');
  console.log('==================================================\n');

  let createdCount = 0;
  let skippedCount = 0;

  // Get all V1 plans
  const plans = await prisma.plan.findMany({
    where: {
      code: { in: Object.keys(V1_PLAN_FEATURES) },
    },
  });

  if (plans.length === 0) {
    console.error('❌ No plans found. Run seed-plans-v1.ts first!');
    process.exit(1);
  }

  console.log(`Found ${plans.length} plans to configure features:\n`);

  // Remove OLD duplicates first (from any previous seeding)
  console.log('🗑️  Removing duplicate PlanFeature entries...');
  const duplicateCount = await prisma.$executeRawUnsafe(`
    WITH ranked AS (
      SELECT id,
             ROW_NUMBER() OVER (PARTITION BY "planId", "feature" ORDER BY id) AS rn
      FROM "PlanFeature"
    )
    DELETE FROM "PlanFeature"
    WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
  `);
  console.log(`   Deleted ${duplicateCount} duplicate entries\n`);

  // Seed features for each plan
  for (const plan of plans) {
    const featuresToSeed =
      V1_PLAN_FEATURES[plan.code as keyof typeof V1_PLAN_FEATURES] || [];

    console.log(`📋 ${plan.name} (${plan.code})`);

    if (featuresToSeed.length === 0) {
      console.log(`   No features assigned`);
      console.log();
      continue;
    }

    for (const feature of featuresToSeed) {
      try {
        // Check if already exists
        const existing = await prisma.planFeature.findUnique({
          where: {
            planId_feature: {
              planId: plan.id,
              feature: feature as any,
            },
          },
        });

        if (existing) {
          console.log(`   ⏭️  ${feature} (already exists)`);
          skippedCount++;
          continue;
        }

        // Create feature assignment
        await prisma.planFeature.create({
          data: {
            planId: plan.id,
            feature: feature as any,
          },
        });

        console.log(`   ✅ ${feature}`);
        createdCount++;
      } catch (error: any) {
        console.error(`   ❌ Failed to assign ${feature}:`, error.message);
        throw error;
      }
    }
    console.log();
  }

  console.log('==================================================');
  console.log('📊 Summary:');
  console.log(`   ✅ Features assigned: ${createdCount}`);
  console.log(`   ⏭️  Skipped (already exist): ${skippedCount}`);
  console.log(
    `   🔒 Total PlanFeature records: ${await prisma.planFeature.count()}`,
  );
  console.log('\n✅ V1 Plan Features seeded successfully!\n');

  console.log('⚠️  IMPORTANT:');
  console.log('   - Features now live ONLY in PlanFeature table');
  console.log('   - plan.features JSON should be ignored');
  console.log('   - No duplicates or legacy data present');
  console.log('==================================================\n');
}

seedPlanFeatures()
  .catch((error) => {
    console.error('\n❌ FATAL ERROR:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
