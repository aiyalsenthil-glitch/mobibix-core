/**
 * ============================================================
 * SEED SCRIPT: V1 Plans, Features, and Pricing
 * ============================================================
 *
 * LOCKED ARCHITECTURE:
 *   1. Plan ≠ Duration (duration calculated in TenantSubscription)
 *   2. Plan contains ONLY: id, code, name, level, module, isActive, isPublic, isAddon
 *   3. Features stored ONLY in PlanFeature table
 *   4. Prices stored ONLY in PlanPrice table
 *   5. Plans are MODULE-SCOPED (GYM, MOBILE_SHOP, WHATSAPP_CRM)
 *
 * Plans Created (7 total):
 *   GYM module:
 *     - GYM_TRIAL (level 0, free)
 *     - GYM_STANDARD (level 1, standard features)
 *     - GYM_PRO (level 2, premium features)
 *   MOBILE_SHOP module:
 *     - MOBIBIX_TRIAL (level 0, free)
 *     - MOBIBIX_STANDARD (level 1, ecommerce basic)
 *     - MOBIBIX_PRO (level 2, ecommerce advanced)
 *   WHATSAPP_CRM module:
 *     - WHATSAPP_CRM (isAddon=true, unlocks advanced WhatsApp)
 *
 * Operation: UPSERT (idempotent, safe to run multiple times)
 * Seed Order: Plan → PlanFeature → PlanPrice
 *
 * Usage:
 *   npx ts-node -r dotenv/config prisma/seed-plans-v1.ts
 *
 * ============================================================
 */

import { PrismaClient, BillingCycle, WhatsAppFeature } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * LOCKED PLAN DEFINITIONS
 */
const V1_PLANS = [
  // ======== GYM Module ========
  {
    code: 'GYM_TRIAL',
    name: 'GYM Trial',
    module: 'GYM' as const,
    level: 0,
    isPublic: false,
    isActive: true,
    isAddon: false,
  },
  {
    code: 'GYM_STANDARD',
    name: 'GYM Standard',
    module: 'GYM' as const,
    level: 1,
    isPublic: true,
    isActive: true,
    isAddon: false,
  },
  {
    code: 'GYM_PRO',
    name: 'GYM Pro',
    module: 'GYM' as const,
    level: 2,
    isPublic: true,
    isActive: true,
    isAddon: false,
  },
  // ======== MOBILE_SHOP Module ========
  {
    code: 'MOBIBIX_TRIAL',
    name: 'MobiBix Trial',
    module: 'MOBILE_SHOP' as const,
    level: 0,
    isPublic: false,
    isActive: true,
    isAddon: false,
  },
  {
    code: 'MOBIBIX_STANDARD',
    name: 'MobiBix Standard',
    module: 'MOBILE_SHOP' as const,
    level: 1,
    isPublic: true,
    isActive: true,
    isAddon: false,
  },
  {
    code: 'MOBIBIX_PRO',
    name: 'MobiBix Pro',
    module: 'MOBILE_SHOP' as const,
    level: 2,
    isPublic: true,
    isActive: true,
    isAddon: false,
  },
  // ======== WHATSAPP_CRM Module ========
  {
    code: 'WHATSAPP_CRM',
    name: 'WhatsApp CRM',
    module: 'WHATSAPP_CRM' as const,
    level: 1,
    isPublic: true,
    isActive: true,
    isAddon: true,
  },
];

/**
 * LOCKED FEATURE ASSIGNMENTS (per PlanFeature)
 */
const PLAN_FEATURES: Record<string, WhatsAppFeature[]> = {
  GYM_TRIAL: [
    WhatsAppFeature.MEMBERS_MANAGEMENT,
    WhatsAppFeature.ATTENDANCE_MANAGEMENT,
    WhatsAppFeature.QR_ATTENDANCE,
    WhatsAppFeature.MEMBER_PAYMENT_TRACKING,
    WhatsAppFeature.WELCOME,
    WhatsAppFeature.EXPIRY,
  ],
  GYM_STANDARD: [
    WhatsAppFeature.MEMBERS_MANAGEMENT,
    WhatsAppFeature.ATTENDANCE_MANAGEMENT,
    WhatsAppFeature.QR_ATTENDANCE,
    WhatsAppFeature.STAFF_MANAGEMENT,
    WhatsAppFeature.MEMBER_PAYMENT_TRACKING,
    WhatsAppFeature.PAYMENT_DUE,
    WhatsAppFeature.REMINDER,
    WhatsAppFeature.WELCOME,
    WhatsAppFeature.EXPIRY,
  ],
  GYM_PRO: [
    WhatsAppFeature.MEMBERS_MANAGEMENT,
    WhatsAppFeature.ATTENDANCE_MANAGEMENT,
    WhatsAppFeature.QR_ATTENDANCE,
    WhatsAppFeature.STAFF_MANAGEMENT,
    WhatsAppFeature.MEMBER_PAYMENT_TRACKING,
    WhatsAppFeature.PAYMENT_DUE,
    WhatsAppFeature.REMINDER,
    WhatsAppFeature.WELCOME,
    WhatsAppFeature.EXPIRY,
    WhatsAppFeature.REPORTS,
  ],
  MOBIBIX_TRIAL: [
    WhatsAppFeature.MEMBERS_MANAGEMENT,
    WhatsAppFeature.STAFF_MANAGEMENT,
    WhatsAppFeature.MEMBER_PAYMENT_TRACKING,
    WhatsAppFeature.PAYMENT_DUE,
    WhatsAppFeature.REMINDER,
  ],
  MOBIBIX_STANDARD: [
    WhatsAppFeature.MEMBERS_MANAGEMENT,
    WhatsAppFeature.STAFF_MANAGEMENT,
    WhatsAppFeature.MEMBER_PAYMENT_TRACKING,
    WhatsAppFeature.PAYMENT_DUE,
    WhatsAppFeature.REMINDER,
  ],
  MOBIBIX_PRO: [
    WhatsAppFeature.MEMBERS_MANAGEMENT,
    WhatsAppFeature.STAFF_MANAGEMENT,
    WhatsAppFeature.MEMBER_PAYMENT_TRACKING,
    WhatsAppFeature.PAYMENT_DUE,
    WhatsAppFeature.REMINDER,
    WhatsAppFeature.REPORTS,
  ],
  WHATSAPP_CRM: [
    WhatsAppFeature.WHATSAPP_ALERTS_ALL,
    WhatsAppFeature.WELCOME,
    WhatsAppFeature.PAYMENT_DUE,
    WhatsAppFeature.REMINDER,
    WhatsAppFeature.EXPIRY,
  ],
};

/**
 * LOCKED PRICING (INR paise)
 * Prices are per billingCycle, stored in PlanPrice table
 * GYM_TRIAL has no pricing (free)
 */
const PLAN_PRICES: Record<string, Record<BillingCycle, number>> = {
  GYM_STANDARD: {
    MONTHLY: 19900,
    QUARTERLY: 49900,
    YEARLY: 179900,
  },
  GYM_PRO: {
    MONTHLY: 39900,
    QUARTERLY: 99900,
    YEARLY: 359900,
  },
  MOBIBIX_STANDARD: {
    MONTHLY: 29900,
    QUARTERLY: 79900,
    YEARLY: 299900,
  },
  MOBIBIX_PRO: {
    MONTHLY: 49900,
    QUARTERLY: 139900,
    YEARLY: 499900,
  },
  WHATSAPP_CRM: {
    MONTHLY: 149900,
    QUARTERLY: 399900,
    YEARLY: 1499900,
  },
};

async function seedPlans() {
  console.log('\n🌱 V1 PLANS, FEATURES & PRICING SEEDER');
  console.log('='.repeat(60));
  console.log('\n✅ Using LOCKED Architecture:');
  console.log('   - Plan ≠ Duration');
  console.log('   - Features in PlanFeature only');
  console.log('   - Prices in PlanPrice only');
  console.log('   - Module-scoped plans (GYM, MOBILE_SHOP, WHATSAPP_CRM)');
  console.log('\n' + '='.repeat(60) + '\n');

  let planCount = 0;
  let featureCount = 0;
  let priceCount = 0;

  // ============================================================
  // STEP 1: Seed Plans (identity only)
  // ============================================================
  console.log('📋 STEP 1: Seeding Plans (identity only)\n');

  for (const planDef of V1_PLANS) {
    try {
      const plan = await prisma.plan.upsert({
        where: { code: planDef.code },
        update: {
          name: planDef.name,
          module: planDef.module,
          level: planDef.level,
          isPublic: planDef.isPublic,
          isActive: planDef.isActive,
          isAddon: planDef.isAddon,
        },
        create: {
          code: planDef.code,
          name: planDef.name,
          module: planDef.module,
          level: planDef.level,
          isPublic: planDef.isPublic,
          isActive: planDef.isActive,
          isAddon: planDef.isAddon,
        },
      });

      console.log(`✅ ${plan.name}`);
      console.log(
        `   Code: ${plan.code} | Module: ${plan.module} | Level: ${plan.level} | Addon: ${plan.isAddon}`,
      );
      planCount++;
    } catch (error: any) {
      console.error(`❌ Failed to seed ${planDef.code}:`, error.message);
      throw error;
    }
  }

  console.log(`\n📊 Plans created/updated: ${planCount}`);

  // ============================================================
  // STEP 2: Seed PlanFeatures
  // ============================================================
  console.log('\n🎯 STEP 2: Seeding PlanFeatures\n');

  for (const [planCode, features] of Object.entries(PLAN_FEATURES)) {
    const plan = await prisma.plan.findUnique({ where: { code: planCode } });
    if (!plan) {
      throw new Error(`Plan not found: ${planCode}`);
    }

    // Delete existing features for this plan (for idempotency)
    await prisma.planFeature.deleteMany({
      where: { planId: plan.id },
    });

    // Create features
    for (const feature of features) {
      await prisma.planFeature.create({
        data: {
          planId: plan.id,
          feature,
        },
      });
      featureCount++;
    }

    console.log(`✅ ${planCode}: ${features.length} features`);
  }

  console.log(`\n📊 PlanFeatures created: ${featureCount}`);

  // ============================================================
  // STEP 3: Seed PlanPrices
  // ============================================================
  console.log('\n💰 STEP 3: Seeding PlanPrices (INR paise)\n');

  for (const [planCode, prices] of Object.entries(PLAN_PRICES)) {
    const plan = await prisma.plan.findUnique({ where: { code: planCode } });
    if (!plan) {
      throw new Error(`Plan not found: ${planCode}`);
    }

    // Delete existing prices for this plan (for idempotency)
    await prisma.planPrice.deleteMany({
      where: { planId: plan.id },
    });

    // Create prices per billing cycle
    for (const [billingCycle, price] of Object.entries(prices)) {
      await prisma.planPrice.create({
        data: {
          planId: plan.id,
          billingCycle: billingCycle as BillingCycle,
          price,
        },
      });
      priceCount++;
    }

    const cycles = Object.keys(prices).join(', ');
    console.log(`✅ ${planCode}: ${cycles}`);
    for (const [cycle, price] of Object.entries(prices)) {
      console.log(`   ${cycle.padEnd(10)} = ₹${(price / 100).toFixed(2)}`);
    }
  }

  console.log(`\n📊 PlanPrices created: ${priceCount}`);

  // ============================================================
  // FINAL SUMMARY
  // ============================================================
  console.log('\n' + '='.repeat(60));
  console.log('✅ SEEDING COMPLETE\n');
  console.log('📊 Summary:');
  console.log(`   ✅ Plans: ${planCount}`);
  console.log(`   ✅ Features: ${featureCount}`);
  console.log(`   ✅ Prices: ${priceCount}`);
  console.log(`   🔒 Total DB Plans: ${await prisma.plan.count()}`);
  console.log(`   🔒 Total DB Features: ${await prisma.planFeature.count()}`);
  console.log(`   🔒 Total DB Prices: ${await prisma.planPrice.count()}`);
  console.log('\n' + '='.repeat(60) + '\n');

  console.log('🚀 V1 Architecture Status:');
  console.log('   ✅ Plan = Identity + Module + Tier only');
  console.log('   ✅ NO price on Plan');
  console.log('   ✅ NO durationDays on Plan');
  console.log('   ✅ NO features JSON on Plan');
  console.log('   ✅ Features in PlanFeature (1:many)');
  console.log('   ✅ Prices in PlanPrice (1:many)');
  console.log('   ✅ Duration calculated at subscription time');
  console.log('\n✨ Safe to launch V1!\n');
}

seedPlans()
  .catch((error) => {
    console.error('\n❌ FATAL ERROR:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
