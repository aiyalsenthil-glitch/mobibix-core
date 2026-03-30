/**
 * ============================================================
 * SEED SCRIPT: MobiBix WhatsApp Templates
 * ============================================================
 *
 * Purpose: Recreate default WhatsApp templates for MobiBix
 *          (ModuleType.MOBILE_SHOP) that were lost during
 *          prisma db push operation.
 *
 * CRITICAL NOTES:
 * - These are for BASIC WhatsApp notifications (NOT WhatsApp CRM)
 * - Must NOT affect GymPilot (ModuleType.GYM)
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
 * - variable-registry.ts (INVOICE_CREATED, PAYMENT_PENDING, JOB_READY, FOLLOW_UP_SCHEDULED)
 * - whatsapp-reminders.service.ts (template key mappings)
 */
const MOBIBIX_TEMPLATES = [
  {
    templateKey: 'invoice_created_confirmation_v1',
    metaTemplateName: 'mobibix_invoice_created',
    REMOVED_TOKENWid: '30381',  // Approved in Authkey portal
    category: 'UTILITY',
    feature: 'INVOICE_CREATED',
    language: 'en',
    status: 'ACTIVE',
    isDefault: true,
    description: 'Sent when a new sales invoice is generated. Media template with dynamic URL button.',
    variables: ['customerName', 'invoiceNumber'],
    bodyExample: `Hello {{customerName}},\n\nYour invoice for order {{invoiceNumber}} is attached.\n\nThank you for shopping with us!`,
  },
  {
    templateKey: 'payment_pending_reminder_v1',
    metaTemplateName: 'mobibix_payment_reminder',
    REMOVED_TOKENWid: '30380',  // Approved in Authkey portal
    category: 'UTILITY',
    feature: 'PAYMENT_PENDING',
    language: 'en',
    status: 'ACTIVE',
    isDefault: true,
    description: 'Reminder for pending invoice payment',
    variables: ['customer_name', 'invoice_number', 'pending_amount'],
    bodyExample: `Hello {{customer_name}},\n\nThis is a reminder regarding a pending payment.\n\nInvoice Number: {{invoice_number}}\nPending Amount: ₹{{pending_amount}}\n\nPlease contact us if you need any clarification.`,
  },
  {
    templateKey: 'job_created_v1',
    metaTemplateName: 'mobibix_job_created',
    REMOVED_TOKENWid: '30382',  // Approved in Authkey portal
    category: 'UTILITY',
    feature: 'JOB_CREATED',
    language: 'en',
    status: 'ACTIVE',
    isDefault: true,
    description: 'Sent when a new repair job card is created',
    variables: ['customer_name', 'device_model', 'job_number'],
    bodyExample: `Hi {{customer_name}}, we have received your {{device_model}} for repair.\n\nJob ID: #{{job_number}}\n\nWe will keep you updated on the repair progress.`,
  },
  {
    templateKey: 'job_status_ready_v1',
    metaTemplateName: 'mobibix_job_ready',
    REMOVED_TOKENWid: '30383',  // Pending in Authkey portal
    category: 'UTILITY',
    feature: 'JOB_READY',
    language: 'en',
    status: 'ACTIVE',
    isDefault: true,
    description: 'Notification when repair job is ready for pickup',
    variables: ['customer_name', 'shop_name', 'job_number', 'device_model'],
    bodyExample: `Great news, {{customer_name}}! Your {{device_model}} is repaired and ready for pickup at {{shop_name}}.\n\nJob ID: #{{job_number}}\n\nPlease visit us during business hours to collect your device.`,
  },
  {
    templateKey: 'job_completed_v1',
    metaTemplateName: 'mobibix_job_completed',
    REMOVED_TOKENWid: '30384',  // Pending in Authkey portal
    category: 'UTILITY',
    feature: 'JOB_COMPLETED',
    language: 'en',
    status: 'ACTIVE',
    isDefault: true,
    description: 'Notification when repair job is marked completed and collected',
    variables: ['shop_name', 'customer_name', 'job_number', 'device_model', 'final_cost'],
    bodyExample: `Hi {{customer_name}}, your repair at {{shop_name}} is now complete.\n\nDevice: {{device_model}}\nJob ID: #{{job_number}}\nFinal amount: ₹{{final_cost}}\n\nThank you for choosing us!`,
  },
  {
    templateKey: 'crm_followup_reminder_v1',
    metaTemplateName: 'mobibix_followup_reminder',
    REMOVED_TOKENWid: '30385',  // Pending in Authkey portal
    category: 'UTILITY',
    feature: 'FOLLOW_UP_SCHEDULED',
    language: 'en',
    status: 'ACTIVE',
    isDefault: true,
    description: 'Reminder for scheduled customer follow-up',
    variables: ['customer_name', 'purpose', 'scheduled_at'],
    bodyExample: `Hello {{customer_name}},\n\nThis is a reminder regarding your pending follow-up.\n\nPurpose: {{purpose}}\nScheduled On: {{scheduled_at}}\n\nIf you have any questions, please reply to this message.`,
  },
  {
    templateKey: 'followup_overdue_v1',
    metaTemplateName: 'mobibix_followup_overdue',
    REMOVED_TOKENWid: '30386',  // Approved in Authkey portal — NOTE: Authkey categorized as Marketing
    category: 'MARKETING', // Marketing category — requires WA Pro/Business plan
    feature: 'FOLLOW_UP_OVERDUE',
    language: 'en',
    status: 'ACTIVE',
    isDefault: true,
    description: 'Sent when a follow-up is overdue. Marketing category — plan-gated.',
    variables: ['customer_name', 'days_overdue'],
    bodyExample: `Hi {{customer_name}}, we noticed we haven't connected in a while.\n\nYour follow-up is overdue by {{days_overdue}} day(s). We'd love to catch up.\n\nPlease reply to this message whenever you're ready.`,
  },
];

async function seedMobiBixTemplates() {
  console.log('🏪 MobiBix WhatsApp Template Seeder');
  console.log('==================================================\n');

  const MODULE = 'MOBILE_SHOP';
  let deletedCount = 0;
  let createdCount = 0;
  let skippedCount = 0;

  // Step 1: Safety check - Verify we're not affecting GYM templates
  const gymTemplateCount = await prisma.whatsAppTemplate.count({
    where: { moduleType: 'GYM' },
  });
  console.log(
    `✅ Safety Check: ${gymTemplateCount} GYM templates exist (will not be touched)\n`,
  );

  // Step 2: Delete existing MOBILE_SHOP templates that conflict
  console.log('🗑️  Cleaning up existing MOBILE_SHOP templates...');
  const templateNames = MOBIBIX_TEMPLATES.map((t) => t.metaTemplateName);

  const deleteResult = await prisma.whatsAppTemplate.deleteMany({
    where: {
      moduleType: MODULE,
      metaTemplateName: { in: templateNames },
    },
  });
  deletedCount = deleteResult.count;
  console.log(`   Deleted: ${deletedCount} existing templates\n`);

  // Step 3: Create new templates
  console.log('📝 Creating MobiBix WhatsApp templates...\n');

  for (const template of MOBIBIX_TEMPLATES) {
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
          REMOVED_TOKENWid: template.REMOVED_TOKENWid,
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
    `   📱 Total templates for MOBILE_SHOP: ${await prisma.whatsAppTemplate.count({ where: { moduleType: MODULE } })}`,
  );

  // Step 5: Final safety check
  const finalGymCount = await prisma.whatsAppTemplate.count({
    where: { moduleType: 'GYM' },
  });

  if (finalGymCount !== gymTemplateCount) {
    throw new Error(
      `❌ CRITICAL: GYM template count changed! Was ${gymTemplateCount}, now ${finalGymCount}`,
    );
  }

  console.log(`   🛡️  GYM templates unchanged: ${finalGymCount}`);
  console.log('\n✅ MobiBix templates seeded successfully!\n');

  // Step 6: Display placeholder mapping for developer reference
  console.log('==================================================');
  console.log('📋 Placeholder Mapping Reference:');
  console.log('==================================================\n');

  for (const template of MOBIBIX_TEMPLATES) {
    console.log(`Template: ${template.templateKey}`);
    console.log(`Feature: ${template.feature}`);
    console.log(`Variables: ${template.variables.join(', ')}`);
    console.log();
  }

  console.log('==================================================');
  console.log('⚠️  NEXT STEPS:');
  console.log('==================================================');
  console.log('1. Create these templates in Meta Business Manager');
  console.log('2. Get approval from WhatsApp');
  console.log('3. Update metaTemplateId in database once approved');
  console.log('4. Verify variable resolution works with test sends');
  console.log('==================================================\n');
}

seedMobiBixTemplates()
  .catch((error) => {
    console.error('\n❌ FATAL ERROR:', error);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
