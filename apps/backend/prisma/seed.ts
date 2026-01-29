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
      : moduleType === 'MOBILESHOP'
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
    await prisma.whatsAppAutomation.upsert({
      where: {
        moduleType_triggerType: {
          moduleType: moduleType,
          triggerType: automation.triggerType,
        },
      },
      update: {
        templateKey: automation.templateKey,
        offsetDays: automation.offsetDays,
        enabled: automation.enabled,
      },
      create: {
        moduleType: moduleType,
        ...automation,
      },
    });
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

async function main() {
  // TRIAL
  await prisma.plan.upsert({
    where: { name: 'TRIAL' },
    update: {},
    create: {
      name: 'TRIAL',
      level: 0,
      price: 0,
      durationDays: 14,
    },
  });

  // BASIC
  await prisma.plan.upsert({
    where: { name: 'BASIC' },
    update: {},
    create: {
      name: 'BASIC',
      level: 1,
      price: 999,
      durationDays: 30,
    },
  });
  // PLUS
  await prisma.plan.upsert({
    where: { name: 'PLUS' },
    update: {},
    create: {
      name: 'PLUS',
      level: 2,
      price: 149,
      durationDays: 30,
    },
  });

  // PRO
  await prisma.plan.upsert({
    where: { name: 'PRO' },
    update: {},
    create: {
      name: 'PRO',
      level: 3,
      price: 1999,
      durationDays: 365,
    },
  });

  //ULTIMATE
  await prisma.plan.upsert({
    where: { name: 'ULTIMATE' },
    update: {},
    create: {
      name: 'ULTIMATE',
      level: 4,
      price: 4999,
      durationDays: 365,
    },
  });

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

  const moduleTypes = ['GYM', 'MOBILESHOP'];
  for (const moduleType of moduleTypes) {
    const result = await seedWhatsAppForModule(moduleType);
    totalTemplates += result.templatesCount;
    totalAutomations += result.automationsCount;
  }

  console.log(`✅ WhatsApp configuration seeded`);
  console.log(`   Settings created: ${totalSettings}`);
  console.log(`   Templates seeded: ${totalTemplates}`);
  console.log(`   Automations seeded: ${totalAutomations}`);

  // PHONE NUMBERS INITIALIZATION
  console.log('\n🌱 Seeding WhatsApp phone numbers...');
  const phoneResult = await seedPhoneNumbers();
  console.log(`✅ Phone numbers configured`);
  console.log(`   Created: ${phoneResult.created}`);
  console.log(`   Skipped: ${phoneResult.skipped}`);
  console.log(`   Total tenants: ${phoneResult.total}`);

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
