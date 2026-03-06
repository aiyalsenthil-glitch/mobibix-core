import { PrismaClient, ModuleType, BillingCycle } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const ADDON_PACKS = [
  {
    code: 'WA_ADDON_500',
    name: 'WhatsApp Pack 500 (Utility)',
    level: 0,
    module: ModuleType.GYM, // Module agnostic technically, but required field
    isAddon: true,
    meta: {
      quota: {
        utility: 500,
        marketing: 0,
      },
    },
    price: 19900, // ₹199.00
  },
  {
    code: 'WA_ADDON_200',
    name: 'WhatsApp Pack 200 (Marketing)',
    level: 0,
    module: ModuleType.GYM,
    isAddon: true,
    meta: {
      quota: {
        utility: 0,
        marketing: 200,
      },
    },
    price: 19900, // ₹199.00
  },
];

async function main() {
  console.log('🌱 Seeding V1 Add-on Packs...');

  for (const pack of ADDON_PACKS) {
    // 1. Upsert Plan
    const plan = await prisma.plan.upsert({
      where: { code: pack.code },
      update: {
        name: pack.name,
        isAddon: true,
        meta: pack.meta as any, // Cast for JSON compatibility
      },
      create: {
        code: pack.code,
        name: pack.name,
        level: pack.level,
        module: pack.module,
        isActive: true,
        isPublic: true,
        isAddon: true,
        meta: pack.meta as any,
      },
    });

    console.log(`✅ Plan ensured: ${plan.code}`);

    // 2. Ensure ONE_TIME Price (Modeled as MONTHLY for now since schema requires enum)
    // IMPORTANT: The implementation plan treats these as "One-time" purchases via Payment table directly,
    // but we store a reference price here for UI/Admin lookup.
    // We'll use 'MONTHLY' as a placeholder for "Unit Price" in the PlanPrice table for consistency.
    await prisma.planPrice.upsert({
      where: {
        planId_billingCycle_currency: {
          planId: plan.id,
          billingCycle: BillingCycle.MONTHLY,
          currency: 'INR',
        },
      },
      update: {
        price: pack.price,
      },
      create: {
        planId: plan.id,
        billingCycle: BillingCycle.MONTHLY,
        currency: 'INR',
        price: pack.price,
      },
    });
    console.log(`   Price set: ₹${pack.price / 100}`);
  }

  console.log('✨ Add-on Seeding Complete.');
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
