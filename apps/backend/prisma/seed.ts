import dotenv from 'dotenv';
dotenv.config({ path: 'apps/backend/.env' });

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { HSN_DATA } from './hsn-data';

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

  const templates =
    moduleType === 'GYM'
      ? [
          {
            templateKey: 'WELCOME',
            metaTemplateName: 'gym_welcome_v1',
            category: 'UTILITY',
            feature: 'WELCOME',
            language: 'en',
            status: 'ACTIVE',
          },
          {
            templateKey: 'PAYMENT_DUE',
            metaTemplateName: 'gym_payment_due_v1',
            category: 'UTILITY',
            feature: 'PAYMENT_DUE',
            language: 'en',
            status: 'ACTIVE',
          },
          {
            templateKey: 'EXPIRY',
            metaTemplateName: 'gym_expiry_reminder_v1',
            category: 'UTILITY',
            feature: 'EXPIRY',
            language: 'en',
            status: 'ACTIVE',
          },
        ]
      : moduleType === 'MOBILE_SHOP'
        ? [
            {
              templateKey: 'INVOICE_THANK_YOU',
              metaTemplateName: 'sales_invoice_thank_you_v1',
              category: 'UTILITY',
              feature: 'WELCOME',
              language: 'en',
              status: 'ACTIVE',
            },
            {
              templateKey: 'PAYMENT_REMINDER',
              metaTemplateName: 'sales_payment_reminder_v1',
              category: 'UTILITY',
              feature: 'PAYMENT_DUE',
              language: 'en',
              status: 'ACTIVE',
            },
            {
              templateKey: 'JOB_READY',
              metaTemplateName: 'repair_job_ready_v1',
              category: 'UTILITY',
              feature: 'REMINDER',
              language: 'en',
              status: 'ACTIVE',
            },
            {
              templateKey: 'JOB_UPDATE',
              metaTemplateName: 'repair_job_update_v1',
              category: 'UTILITY',
              feature: 'REMINDER',
              language: 'en',
              status: 'ACTIVE',
            },
          ]
        : [];

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

  const automations = [
    {
      triggerType: 'DATE' as const,
      templateKey: 'EXPIRY',
      offsetDays: -3,
      enabled: true,
    },
    {
      triggerType: 'AFTER_INVOICE' as const,
      templateKey: 'PAYMENT_DUE',
      offsetDays: 2,
      enabled: true,
    },
    {
      triggerType: 'AFTER_JOB' as const,
      templateKey: 'WELCOME',
      offsetDays: 0,
      enabled: true,
    },
  ];

  for (const automation of automations) {
    const existing = await prisma.whatsAppAutomation.findFirst({
      where: {
        moduleType: moduleType as any,
        eventType: automation.triggerType,
        templateKey: automation.templateKey,
        offsetDays: automation.offsetDays,
      },
    });

    if (existing) {
      await prisma.whatsAppAutomation.update({
        where: { id: existing.id },
        data: {
          enabled: automation.enabled,
        },
      });
    } else {
      await prisma.whatsAppAutomation.create({
        data: {
          moduleType: moduleType as any,
          eventType: automation.triggerType,
          templateKey: automation.templateKey,
          offsetDays: automation.offsetDays,
          enabled: automation.enabled,
        },
      });
    }
    automationsCount++;
  }

  return { templatesCount, automationsCount };
}

async function seedPhoneNumbers(): Promise<{
  created: number;
  skipped: number;
  total: number;
}> {
  const DEFAULT_PHONE_NUMBER =
    process.env.WHATSAPP_PHONE_NUMBER || '+1234567890';
  const DEFAULT_PHONE_NUMBER_ID =
    process.env.WHATSAPP_PHONE_NUMBER_ID || 'YOUR_PHONE_NUMBER_ID';
  const DEFAULT_WABA_ID = process.env.WHATSAPP_WABA_ID || 'YOUR_WABA_ID';

  const tenants = await prisma.tenant.findMany({
    select: { id: true, name: true },
  });

  let created = 0;
  let skipped = 0;

  for (const tenant of tenants) {
    // Check if tenant already has a default phone number
    const existingPhone = await prisma.whatsAppPhoneNumber.findFirst({
      where: { tenantId: tenant.id },
    });

    if (existingPhone) {
      skipped++;
      continue;
    }

    // Create default phone number
    await prisma.whatsAppPhoneNumber.create({
      data: {
        tenantId: tenant.id,
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

  return { created, skipped, total: tenants.length };
}

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
      features: FEATURES_ULTIMATE, // Trial gets everything
    },
    {
      code: 'BASIC',
      name: 'BASIC',
      level: 1,
      price: 99,
      durationDays: 30,
      memberLimit: 50,
      features: FEATURES_BASIC,
    },
    {
      code: 'PLUS',
      name: 'PLUS',
      level: 2,
      price: 149,
      durationDays: 30,
      memberLimit: 100,
      features: FEATURES_PLUS,
    },
    {
      code: 'PRO',
      name: 'PRO',
      level: 3,
      price: 1999, // Keeping original price logic or updating? Request said BASIC 99, PLUS 149. PRO/ULTIMATE prices were not specified to change, but I will infer a hierarchy. Let's keep existing high prices or set reasonable defaults if not specified. Wait, the request said:
      // BASIC (₹99), PLUS (₹149). PRO and ULTIMATE didn't have prices listed in the text, but the code had 1999 and 4999. I will stick to the text for BASIC/PLUS and existing for PRO/ULTIMATE unless user clarifies? No, the text implies a hierarchy. I'll use 999 for PRO and 2499 for ULTIMATE as reasonable steps, or stick to the code's 1999/4999 to be safe. Let's stick to the code's previous high values for PRO/ULTIMATE to avoid accidental revenue loss, but update BASIC/PLUS as requested.
      // Actually previous code: BASIC 999, PRO 1999, ULTIMATE 4999.
      // Request: BASIC 99, PLUS 149. This is specific.
      // I will set PRO to 499 and ULTIMATE to 999 to match the scale, OR keep them high.
      // Let's assume standard SaaS pricing: 99 -> 149 -> 499 (?) -> 999 (?).
      // I will leave PRO at 1999 and ULTIMATE at 4999 as they were, only updating features.
      features: FEATURES_PRO,
    },
    {
      code: 'ULTIMATE',
      name: 'ULTIMATE',
      level: 4,
      price: 4999,
      durationDays: 365,
      memberLimit: 500,
      features: FEATURES_ULTIMATE, // Explicitly map legacy features too if needed?
      // "do NOT change feature keys already consumed by Android UI"
      // The Android UI consumes: WELCOME, EXPIRY, PAYMENT_DUE, REMINDER.
      // So I must include them in the respective levels.
      // WHATSAPP_ALERTS_BASIC -> likely maps to PAYMENT_DUE, REMINDER?
      // WHATSAPP_ALERTS_ALL -> likely maps to WELCOME, EXPIRY?
      // Wait, I need to Map the legacy keys to these bundles to ensure Android keeps working!
      // The request said "Gate WhatsApp automation execution using plan.features... If features array is empty allow all".
      // But it also said "Android continues to display features from plan.features".
      // So `plan.features` JSON (consumed by Android) MUST contain the old keys: 'WELCOME', 'EXPIRY', etc.
      // I will add them to the relevant lists.
    },
  ];

  // Re-map features to include legacy keys for Android compatibility
  // PRO (Basic Alerts) -> PAYMENT_DUE, REMINDER
  // ULTIMATE (All Alerts) -> WELCOME, EXPIRY

  const LEGACY_BASIC = ['PAYMENT_DUE', 'REMINDER'];
  const LEGACY_ALL = [...LEGACY_BASIC, 'WELCOME', 'EXPIRY'];

  // Update features with legacy keys
  plans[3].features = [...FEATURES_PRO, ...LEGACY_BASIC]; // PRO
  plans[4].features = [...FEATURES_ULTIMATE, ...LEGACY_ALL]; // ULTIMATE
  plans[0].features = [...FEATURES_ULTIMATE, ...LEGACY_ALL]; // TRIAL

  for (const p of plans) {
    // 1. Upsert Plan
    // We try to find by name to maintain existing logic
    const existingPlan = await prisma.plan.findFirst({
      where: { name: p.name },
    });

    let planId = existingPlan?.id;

    if (existingPlan) {
      await prisma.plan.update({
        where: { id: existingPlan.id },
        data: {
          level: p.level,
          price: p.price,
          durationDays: p.durationDays,
          memberLimit: p.memberLimit,
          billingCycle: 'MONTHLY',
          // Legacy JSON column update if needed
          features: p.features as any, 
        },
      });
      console.log(`✅ Updated Plan: ${p.name}`);
    } else {
      const created = await prisma.plan.create({
        data: {
          code: p.code,
          name: p.name,
          level: p.level,
          price: p.price,
          currency: 'INR',
          durationDays: p.durationDays,
          memberLimit: p.memberLimit,
          features: p.features as any,
          isActive: true,
          billingCycle: 'MONTHLY',
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
          data: p.features.map((f) => ({
            planId: planId!,
            feature: f as any, // Cast to any to bypass enum strictness in seed
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
  // GLOBAL GYM AUTOMATIONS (Platform-level, no tenantId)
  // ────────────────────────────────────────────────
  console.log('\n🌱 Seeding GLOBAL WhatsApp automations for Gym SaaS...');
  const WhatsAppTemplates = {
    WELCOME: 'new_member_welcome_v3',
    EXPIRY: 'membership_expiry_reminder',
    PAYMENT_DUE: 'payment_due_notice_util_v1',
  };
  const templateKeys = Object.values(WhatsAppTemplates);
  const foundTemplates = await prisma.whatsAppTemplate.findMany({
    where: {
      templateKey: { in: templateKeys },
      moduleType: 'GYM',
      status: 'ACTIVE',
    },
    select: { templateKey: true },
  });
  const foundSet = new Set(foundTemplates.map((t) => t.templateKey));

  // 1️⃣ NEW MEMBER WELCOME
  if (foundSet.has(WhatsAppTemplates.WELCOME)) {
    await prisma.whatsAppAutomation.upsert({
      where: {
        moduleType_eventType: {
          moduleType: 'GYM',
          eventType: 'MEMBER_CREATED',
        },
      },
      update: {
        templateKey: WhatsAppTemplates.WELCOME,
        offsetDays: 0,
        conditions: { set: null },
        enabled: true,
      },
      create: {
        moduleType: 'GYM',
        eventType: 'MEMBER_CREATED',
        templateKey: WhatsAppTemplates.WELCOME,
        offsetDays: 0,
        conditions: { set: null },
        enabled: true,
      },
    });
    console.log('✅ Seeded: NEW MEMBER WELCOME');
  } else {
    console.log('❌ Skipped: NEW MEMBER WELCOME (template missing)');
  }

  // 2️⃣ MEMBERSHIP EXPIRY REMINDER (BEFORE)
  if (foundSet.has(WhatsAppTemplates.EXPIRY)) {
    await prisma.whatsAppAutomation.upsert({
      where: {
        moduleType_eventType: {
          moduleType: 'GYM',
          eventType: 'MEMBERSHIP_EXPIRY',
        },
      },
      update: {
        templateKey: WhatsAppTemplates.EXPIRY,
        offsetDays: -3,
        conditions: [
          { field: 'expiryDate', operator: 'DAYS_BEFORE', value: 3 },
        ],
        enabled: true,
      },
      create: {
        moduleType: 'GYM',
        eventType: 'MEMBERSHIP_EXPIRY',
        templateKey: WhatsAppTemplates.EXPIRY,
        offsetDays: -3,
        conditions: [
          { field: 'expiryDate', operator: 'DAYS_BEFORE', value: 3 },
        ],
        enabled: true,
      },
    });
    console.log('✅ Seeded: MEMBERSHIP EXPIRY REMINDER (BEFORE)');
  } else {
    console.log('❌ Skipped: MEMBERSHIP EXPIRY REMINDER (template missing)');
  }

  // 3️⃣ PAYMENT DUE NOTICE (AFTER EXPIRY)
  if (foundSet.has(WhatsAppTemplates.PAYMENT_DUE)) {
    await prisma.whatsAppAutomation.upsert({
      where: {
        moduleType_eventType: {
          moduleType: 'GYM',
          eventType: 'MEMBERSHIP_EXPIRED',
        },
      },
      update: {
        templateKey: WhatsAppTemplates.PAYMENT_DUE,
        offsetDays: 1,
        conditions: [{ field: 'pendingAmount', operator: '>', value: 0 }],
        enabled: true,
      },
      create: {
        moduleType: 'GYM',
        eventType: 'MEMBERSHIP_EXPIRED',
        templateKey: WhatsAppTemplates.PAYMENT_DUE,
        offsetDays: 1,
        conditions: [{ field: 'pendingAmount', operator: '>', value: 0 }],
        enabled: true,
      },
    });
    console.log('✅ Seeded: PAYMENT DUE NOTICE (AFTER EXPIRY)');
  } else {
    console.log('❌ Skipped: PAYMENT DUE NOTICE (template missing)');
  }

  // PHONE NUMBERS INITIALIZATION
  console.log('\n🌱 Seeding WhatsApp phone numbers...');
  const phoneResult = await seedPhoneNumbers();
  console.log(`✅ Phone numbers configured`);
  console.log(`   Created: ${phoneResult.created}`);
  console.log(`   Skipped: ${phoneResult.skipped}`);
  console.log(`   Total tenants: ${phoneResult.total}`);

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
    phoneResult.created > 0 &&
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
