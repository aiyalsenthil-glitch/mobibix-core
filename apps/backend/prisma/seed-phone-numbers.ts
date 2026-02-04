/**
 * Seed Script: Add Default Phone Numbers for Existing Tenants
 *
 * This script helps migrate existing tenants to the new multi-phone number system.
 * It creates a DEFAULT phone number entry for each tenant that doesn't have one yet.
 *
 * ⚠️ IMPORTANT: You must update WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_WABA_ID below
 * with your actual Meta WhatsApp Business credentials before running this script.
 *
 * Usage:
 *   npx ts-node prisma/seed-phone-numbers.ts
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

// ⚠️ TODO: Replace with your actual Meta WhatsApp Business credentials
const DEFAULT_PHONE_NUMBER =
  process.env.WHATSAPP_PHONE_NUMBER || '++918667551566';
const DEFAULT_PHONE_NUMBER_ID =
  process.env.WHATSAPP_PHONE_NUMBER_ID || 'YOUR_PHONE_NUMBER_ID';
const DEFAULT_WABA_ID = process.env.WHATSAPP_WABA_ID || 'YOUR_WABA_ID';

async function seedPhoneNumbers() {
  console.log('🔍 Checking for tenants without phone numbers...\n');

  // Get all tenants
  const tenants = await prisma.tenant.findMany({
    select: { id: true, name: true },
  });

  console.log(`Found ${tenants.length} total tenants\n`);

  let created = 0;
  let skipped = 0;

  for (const tenant of tenants) {
    // Check if tenant already has a default phone number
    const existingPhone = await prisma.whatsAppPhoneNumber.findFirst({
      where: { tenantId: tenant.id },
    });

    if (existingPhone) {
      console.log(`⏭️  Skipping "${tenant.name}" - already has phone numbers`);
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

    console.log(`✅ Created default phone number for "${tenant.name}"`);
    created++;
  }

  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Created: ${created}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   📱 Total: ${tenants.length}`);

  if (
    created > 0 &&
    (DEFAULT_PHONE_NUMBER_ID === 'YOUR_PHONE_NUMBER_ID' ||
      DEFAULT_WABA_ID === 'YOUR_WABA_ID')
  ) {
    console.log(`\n⚠️  WARNING: You used placeholder credentials!`);
    console.log(
      `   Please update the phone number IDs in the database with your actual Meta credentials.`,
    );
    console.log(
      `   You can do this via the Phone Numbers management UI at /phone-numbers`,
    );
  }
}

seedPhoneNumbers()
  .catch((error) => {
    console.error('❌ Error seeding phone numbers:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
