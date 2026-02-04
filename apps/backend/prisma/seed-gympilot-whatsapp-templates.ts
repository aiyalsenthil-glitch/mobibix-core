/**
 * ============================================================
 * SEED SCRIPT: GymPilot WhatsApp Templates
 * ============================================================
 *
 * Purpose: Recreate default WhatsApp templates for GymPilot
 *          (ModuleType.GYM) as DEFAULT SYSTEM templates.
 *
 * CRITICAL NOTES:
 * - These are for BASIC WhatsApp notifications (NOT WhatsApp CRM)
 * - Must NOT affect MobiBix (ModuleType.MOBILE_SHOP)
 * - Templates match backend variable resolver expectations
 * - Operation is IDEMPOTENT (safe to run multiple times)
 *
 * Usage:
 *   npx ts-node prisma/seed-mobibix-whatsapp-templates.ts
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
 * Template definitions matching backend expectations
 * Based on:
 * - variable-registry.ts (MEMBER_CREATED, PAYMENT_DUE, MEMBERSHIP_EXPIRY)
 * - automation.service.ts (event type mappings)
 * - whatsapp-gating.ts (feature mappings)
 */
const GYMPILOT_TEMPLATES = [
  {
    templateKey: 'new_member_welcome_v3',
    metaTemplateName: 'new_member_welcome_v3',
    category: 'UTILITY',
    feature: 'MEMBER_CREATED',
    language: 'en',
    status: 'ACTIVE',
    isDefault: true,
    description: 'Welcome message sent when new member joins the gym',
    // Variables map to placeholders: {{1}} = member_name, {{2}} = gym_name, {{3}} = start_date, {{4}} = end_date
    variables: ['member_name', 'gym_name', 'start_date', 'end_date'],
    bodyExample: `Hello {{member_name}}, welcome to {{gym_name}}!

Your subscription has been successfully activated.
Please find your membership details below:

Start Date: {{start_date}}
End Date: {{end_date}}

Thank you.`,
  },
  {
    templateKey: 'payment_due_notice_util_v1',
    metaTemplateName: 'payment_due_notice_util_v1',
    category: 'UTILITY',
    feature: 'PAYMENT_DUE',
    language: 'en',
    status: 'ACTIVE',
    isDefault: true,
    description: 'Payment reminder for pending gym membership fees',
    // Variables map to placeholders: {{1}} = amount, {{2}} = due_date
    variables: ['amount', 'due_date'],
    bodyExample: `Your gym membership payment of ₹{{amount}} is due on {{due_date}}.

This is an automated system message.`,
  },
];

async function seedGymPilotTemplates() {
  console.log('🏋️ GymPilot WhatsApp Template Seeder');
  console.log('==================================================\n');

  const MODULE = 'GYM';
  let deletedCount = 0;
  let createdCount = 0;
  let skippedCount = 0;

  // Step 1: Safety check - Verify we're not affecting MOBILE_SHOP templates
  const mobileShopTemplateCount = await prisma.whatsAppTemplate.count({
    where: { moduleType: 'MOBILE_SHOP' },
  });
  console.log(
    `✅ Safety Check: ${mobileShopTemplateCount} MOBILE_SHOP templates exist (will not be touched)\n`,
  );

  // Step 2: Delete existing GYM templates that conflict
  console.log('🗑️  Cleaning up existing GYM templates...');
  const templateNames = GYMPILOT_TEMPLATES.map((t) => t.metaTemplateName);

  const deleteResult = await prisma.whatsAppTemplate.deleteMany({
    where: {
      moduleType: MODULE,
      metaTemplateName: { in: templateNames },
    },
  });
  deletedCount = deleteResult.count;
  console.log(`   Deleted: ${deletedCount} existing templates\n`);

  // Step 3: Create new templates
  console.log('📝 Creating GymPilot WhatsApp templates...\n');

  for (const template of GYMPILOT_TEMPLATES) {
    try {
      // Check if already exists (race condition protection)
      const existing = await prisma.whatsAppTemplate.findUnique({
        where: {
          moduleType_metaTemplateName: {
            moduleType: MODULE,
            metaTemplateName: template.metaTemplateName,
          },
        },
      });

      if (existing) {
        console.log(`   ⏭️  Skipped: ${template.templateKey} (already exists)`);
        skippedCount++;
        continue;
      }

      // Create template
      await prisma.whatsAppTemplate.create({
        data: {
          moduleType: MODULE,
          templateKey: template.templateKey,
          metaTemplateName: template.metaTemplateName,
          category: template.category,
          feature: template.feature,
          language: template.language,
          status: template.status,
          isDefault: template.isDefault,
          variables: template.variables,
        },
      });

      console.log(`   ✅ Created: ${template.templateKey}`);
      console.log(`      Feature: ${template.feature}`);
      console.log(
        `      Variables: ${template.variables.map((v) => `{{${v}}}`).join(', ')}`,
      );
      console.log();

      createdCount++;
    } catch (error: any) {
      console.error(
        `   ❌ Failed to create ${template.templateKey}:`,
        error.message,
      );
      throw error; // Fail loudly on error
    }
  }

  // Step 4: Verification
  console.log('==================================================');
  console.log('📊 Summary:');
  console.log(`   🗑️  Deleted: ${deletedCount}`);
  console.log(`   ✅ Created: ${createdCount}`);
  console.log(`   ⏭️  Skipped: ${skippedCount}`);
  console.log(
    `   🏋️ Total templates for GYM: ${await prisma.whatsAppTemplate.count({ where: { moduleType: MODULE } })}`,
  );

  // Step 5: Final safety check
  const finalMobileShopCount = await prisma.whatsAppTemplate.count({
    where: { moduleType: 'MOBILE_SHOP' },
  });

  if (finalMobileShopCount !== mobileShopTemplateCount) {
    throw new Error(
      `❌ CRITICAL: MOBILE_SHOP template count changed! Was ${mobileShopTemplateCount}, now ${finalMobileShopCount}`,
    );
  }

  console.log(
    `   🛡️  MOBILE_SHOP templates unchanged: ${finalMobileShopCount}`,
  );
  console.log('\n✅ GymPilot templates seeded successfully!\n');

  // Step 6: Display placeholder mapping for developer reference
  console.log('==================================================');
  console.log('📋 Placeholder Mapping Reference:');
  console.log('==================================================\n');

  for (const template of GYMPILOT_TEMPLATES) {
    console.log(`Template: ${template.templateKey}`);
    console.log(`Feature: ${template.feature}`);
    console.log(`Variables: ${template.variables.join(', ')}`);
    console.log();
  }

  console.log('==================================================');
  console.log('⚠️  NEXT STEPS:');
  console.log('==================================================');
  console.log('1. These templates are already approved in Meta');
  console.log('2. Verify variable resolution with test automations');
  console.log('3. Check WhatsApp automation triggers are enabled');
  console.log('==================================================\n');
}

seedGymPilotTemplates()
  .catch((error) => {
    console.error('\n❌ FATAL ERROR:', error);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
