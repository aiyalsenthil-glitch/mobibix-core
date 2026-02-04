import dotenv from 'dotenv';
dotenv.config({ path: 'apps/backend/.env' });

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { HSN_DATA } from './hsn-data';
import { WhatsAppConfigValidator } from '../src/modules/whatsapp/whatsapp.config-validator';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

async function seedWhatsAppSettingsForTenant(tenantId: string): Promise<{
  settingsCreated: boolean;
}> {
  let settingsCreated = false;

  const existingSetting = await prisma.whatsAppSetting.findUnique({
    where: { tenantId },
  });

  if (!existingSetting) {
    await prisma.whatsAppSetting.create({
      data: {
        tenantId,
        enabled: false,
        provider: 'META',
        defaultLanguage: 'en',
        dailyLimit: 100,
        testPhone: null,
        marketingOptInRequired: true,
      },
    });
    settingsCreated = true;
  }

  return { settingsCreated };
}

async function seedWhatsAppForModule(moduleType: string): Promise<{
  templatesCount: number;
  automationsCount: number;
}> {
  let templatesCount = 0;
  let automationsCount = 0;

  // Templates now seeded via dedicated scripts:
  // - GYM: seed-mobibix-whatsapp-templates.ts
  // - MOBILE_SHOP: seed-mobibix-whatsapp-templates.ts
  const templates: any[] = [];

  for (const template of templates) {
    await prisma.whatsAppTemplate.upsert({
      where: {
        moduleType_metaTemplateName: {
          moduleType: moduleType,
          metaTemplateName: template.metaTemplateName,
        },
      },
      update: {
        category: template.category,
        feature: template.feature,
        language: template.language,
        status: template.status,
      },
      create: {
        moduleType: moduleType,
        ...template,
      },
    });
    templatesCount++;
  }

  return { templatesCount, automationsCount };
}

// Tenant-based phone numbers now seeded via seed-phone-numbers.ts
// Run: npx ts-node prisma/seed-phone-numbers.ts

async function seedModulePhoneNumbers(): Promise<{
  created: number;
  skipped: number;
}> {
  const DEFAULT_PHONE_NUMBER =
    process.env.WHATSAPP_PHONE_NUMBER || '+1234567890';
  const DEFAULT_PHONE_NUMBER_ID =
    process.env.WHATSAPP_PHONE_NUMBER_ID || 'YOUR_PHONE_NUMBER_ID';
  const DEFAULT_WABA_ID = process.env.WHATSAPP_WABA_ID || 'YOUR_WABA_ID';

  const moduleTypes = ['GYM', 'MOBILE_SHOP'];
  let created = 0;
  let skipped = 0;

  for (const moduleType of moduleTypes) {
    const existing = await prisma.whatsAppPhoneNumberModule.findFirst({
      where: { moduleType, phoneNumberId: DEFAULT_PHONE_NUMBER_ID },
    });

    if (existing) {
      skipped++;
      continue;
    }

    await prisma.whatsAppPhoneNumberModule.create({
      data: {
        moduleType,
        phoneNumber: DEFAULT_PHONE_NUMBER,
        phoneNumberId: DEFAULT_PHONE_NUMBER_ID,
        wabaId: DEFAULT_WABA_ID,
        purpose: 'DEFAULT',
        isDefault: true,
        isActive: true,
      },
    });

    created++;
  }

  return { created, skipped };
}

async function main() {
  // ────────────────────────────────────────────────
  // VALIDATE ENV BEFORE SEEDING
  // ────────────────────────────────────────────────
  WhatsAppConfigValidator.validateOrExit();

  // ────────────────────────────────────────────────
  // SEED REQUIRED GLOBAL GYM WHATSAPP TEMPLATES
  // ────────────────────────────────────────────────
  const requiredGymTemplates = [
    {
      templateKey: 'new_member_welcome_v3',
      metaTemplateName: 'New Member Welcome',
      moduleType: 'GYM',
      category: 'UTILITY',
      feature: 'WELCOME',
      language: 'en',
      status: 'ACTIVE',
    },
    {
      templateKey: 'membership_expiry_reminder',
      metaTemplateName: 'Membership Expiry Reminder',
      moduleType: 'GYM',
      category: 'UTILITY',
      feature: 'EXPIRY',
      language: 'en',
      status: 'ACTIVE',
    },
    {
      templateKey: 'payment_due_notice_util_v1',
      metaTemplateName: 'Payment Due Notice',
      moduleType: 'GYM',
      category: 'UTILITY',
      feature: 'PAYMENT_DUE',
      language: 'en',
      status: 'ACTIVE',
    },
  ];
  for (const tpl of requiredGymTemplates) {
    await prisma.whatsAppTemplate.upsert({
      where: {
        moduleType_metaTemplateName: {
          moduleType: tpl.moduleType,
          metaTemplateName: tpl.metaTemplateName,
        },
      },
      update: {
        templateKey: tpl.templateKey,
        category: tpl.category,
        feature: tpl.feature,
        language: tpl.language,
        status: tpl.status,
      },
      create: tpl,
    });
  }
  // Plans
  // V1 CLEAN STRUCTURE - NO LEGACY
  const FEATURES_STANDARD = [
    'MEMBERS_MANAGEMENT',
    'ATTENDANCE_MANAGEMENT',
    'QR_ATTENDANCE',
    'STAFF_MANAGEMENT',
  ];

  const FEATURES_PRO = [
    ...FEATURES_STANDARD,
    'REPORTS',
    'MEMBER_PAYMENT_TRACKING',
    'WHATSAPP_ALERTS_BASIC',
    'PAYMENT_DUE',
    'REMINDER',
  ];

  const FEATURES_WHATSAPP = [
    'WHATSAPP_ALERTS_ALL',
    'WELCOME',
    'EXPIRY',
    'PAYMENT_DUE',
    'REMINDER',
  ];

  // V1 Plans (clean, no duplication)
  const v1Plans = [
    {
      code: 'TRIAL',
      name: 'TRIAL',
      level: 0,
      memberLimit: 50,
      features: [...new Set([...FEATURES_PRO, ...FEATURES_WHATSAPP])], // Trial gets everything (deduplicated)
      isPublic: false,
      module: 'GYM',
    },
    {
      code: 'STANDARD',
      name: 'STANDARD',
      level: 1,
      memberLimit: 100,
      features: FEATURES_STANDARD,
      isPublic: true,
      module: 'GYM',
    },
    {
      code: 'PRO',
      name: 'PRO',
      level: 2,
      memberLimit: 300,
      features: FEATURES_PRO,
      isPublic: true,
      module: 'GYM',
    },
    {
      code: 'WHATSAPP_CRM',
      name: 'WhatsApp CRM',
      level: 10, // Separate add-on
      memberLimit: 0,
      features: FEATURES_WHATSAPP,
      isPublic: true,
      module: 'WHATSAPP_CRM',
    },
  ];

  // V1 Pricing (explicit, no calculation)
  const v1Pricing = {
    TRIAL: {
      MONTHLY: 0, // Free trial
    },
    STANDARD: {
      MONTHLY: 19900, // ₹199/month (in paise)
      QUARTERLY: 49900, // ₹499/quarter
      YEARLY: 179900, // ₹1799/year
    },
    PRO: {
      MONTHLY: 39900, // ₹399/month
      QUARTERLY: 99900, // ₹999/quarter
      YEARLY: 359900, // ₹3599/year
    },
    WHATSAPP_CRM: {
      MONTHLY: 29900, // ₹299/month
      QUARTERLY: 74900, // ₹749/quarter
      YEARLY: 269900, // ₹2699/year
    },
  };

  for (const p of v1Plans) {
    // 1. Upsert Plan (duration-agnostic)
    const existingPlan = await prisma.plan.findFirst({
      where: { code: p.code },
    });

    let planId = existingPlan?.id;

    if (existingPlan) {
      await prisma.plan.update({
        where: { id: existingPlan.id },
        data: {
          name: p.name,
          level: p.level,
          isPublic: p.isPublic,
          module: p.module as any,
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
          isPublic: p.isPublic,
          module: p.module as any,
        },
      });
      planId = created.id;
      console.log(`✅ Created Plan: ${p.name}`);
    }

    // 2. Create PlanPrice entries (Phase 1)
    if (planId && v1Pricing[p.code]) {
      const prices = v1Pricing[p.code];

      for (const [cycle, priceValue] of Object.entries(prices)) {
        await prisma.planPrice.upsert({
          where: {
            planId_billingCycle: {
              planId,
              billingCycle: cycle as any,
            },
          },
          update: {
            price: priceValue as number,
            isActive: true,
          },
          create: {
            planId,
            billingCycle: cycle as any,
            price: priceValue as number,
            isActive: true,
          },
        });
      }
      console.log(
        `   - Created ${Object.keys(prices).length} price points for ${p.name}`,
      );
    }

    // 3. Sync PlanFeature table
    if (planId) {
      await prisma.planFeature.deleteMany({
        where: { planId },
      });

      if (p.features.length > 0) {
        await prisma.planFeature.createMany({
          data: p.features.map((f) => ({
            planId: planId!,
            feature: f as any,
          })),
        });
        console.log(`   - Synced ${p.features.length} features for ${p.name}`);
      }
    }
  }

  console.log('✅ Plans seeded');

  // HSN DATA
  console.log('🌱 Seeding HSN Data...');
  for (const hsn of HSN_DATA) {
    await prisma.hSNCode.upsert({
      where: { code: hsn.code },
      update: {
        description: hsn.description,
        taxRate: hsn.taxRate,
        isActive: true,
      },
      create: {
        code: hsn.code,
        description: hsn.description,
        taxRate: hsn.taxRate,
        isActive: true,
      },
    });
  }
  console.log(`✅ Seeded ${HSN_DATA.length} HSN codes`);

  // WHATSAPP INITIALIZATION
  console.log('\n🌱 Seeding WhatsApp configuration...');
  let tenants = await prisma.tenant.findMany({
    select: { id: true, name: true },
  });

  let totalSettings = 0;
  let totalTemplates = 0;
  let totalAutomations = 0;

  if (tenants.length > 0) {
    for (const tenant of tenants) {
      const result = await seedWhatsAppSettingsForTenant(tenant.id);
      if (result.settingsCreated) totalSettings++;
    }
  }

  const moduleTypes = ['GYM', 'MOBILE_SHOP'];
  for (const moduleType of moduleTypes) {
    const result = await seedWhatsAppForModule(moduleType);
    totalTemplates += result.templatesCount;
    totalAutomations += result.automationsCount;
  }

  // ────────────────────────────────────────────────
  // NOTE: Tenant-based WhatsApp phone numbers removed from main seed
  // Use dedicated script: npx ts-node prisma/seed-phone-numbers.ts
  // ────────────────────────────────────────────────

  // MODULE-LEVEL PHONE NUMBERS
  console.log('\n🌱 Seeding module-scoped WhatsApp phone numbers...');
  const modulePhoneResult = await seedModulePhoneNumbers();
  console.log(`✅ Module phone numbers configured`);
  console.log(`   Created: ${modulePhoneResult.created}`);
  console.log(`   Skipped: ${modulePhoneResult.skipped}`);

  // ────────────────────────────────────────────────
  // Seed module defaults into tenant-scoped rows (idempotent)
  // ────────────────────────────────────────────────
  async function seedModuleDefaultsToTenants(): Promise<{
    created: number;
    skipped: number;
  }> {
    const modules = await prisma.whatsAppPhoneNumberModule.findMany({
      where: { isActive: true },
    });
    if (!modules.length) return { created: 0, skipped: 0 };

    const tenantsList = await prisma.tenant.findMany({
      select: { id: true, code: true },
    });
    let created = 0;
    let skipped = 0;

    for (const t of tenantsList) {
      const existing = await prisma.whatsAppPhoneNumber.findFirst({
        where: { tenantId: t.id },
      });
      if (existing) {
        skipped++;
        continue;
      }

      const data = modules.map((m) => ({
        tenantId: t.id,
        phoneNumber: m.phoneNumber,
        phoneNumberId: m.phoneNumberId,
        wabaId: m.wabaId,
        purpose: m.purpose,
        qualityRating: m.qualityRating,
        isDefault: m.isDefault,
        isActive: m.isActive,
      }));

      try {
        const res = await prisma.whatsAppPhoneNumber.createMany({
          data,
          skipDuplicates: true,
        });
        created += res.count ?? data.length;
        console.log(
          `Seeded ${res.count ?? data.length} numbers for tenant ${t.code} (${t.id})`,
        );
      } catch (err) {
        console.error(
          `Failed to seed tenant ${t.code} (${t.id}):`,
          (err as Error).message || err,
        );
      }
    }

    return { created, skipped };
  }

  console.log('\n🌱 Copying module defaults into tenants (if missing)...');
  const tenantSeedResult = await seedModuleDefaultsToTenants();
  console.log(`✅ Tenant phone numbers seeded from module defaults`);
  console.log(`   Created: ${tenantSeedResult.created}`);
  console.log(
    `   Tenants skipped (already had numbers): ${tenantSeedResult.skipped}`,
  );

  if (
    tenantSeedResult.created > 0 &&
    (process.env.WHATSAPP_PHONE_NUMBER_ID === 'YOUR_PHONE_NUMBER_ID' ||
      process.env.WHATSAPP_WABA_ID === 'YOUR_WABA_ID')
  ) {
    console.log(
      `\n⚠️  WARNING: Using placeholder credentials for phone numbers!`,
    );
    console.log(`   Update in database via Phone Numbers UI or set env vars:`);
    console.log(`   - WHATSAPP_PHONE_NUMBER_ID`);
    console.log(`   - WHATSAPP_WABA_ID`);
    console.log(`   - WHATSAPP_PHONE_NUMBER\n`);
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
