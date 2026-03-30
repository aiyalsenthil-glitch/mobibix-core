/**
 * Seed the platform-level Mobibix WhatsApp system number.
 *
 * This number is used for all tenants who do NOT have their own WhatsApp
 * subscription — sends utility notifications (invoices, job alerts, etc.)
 *
 * Number: +1 555-901-7861 (Meta test → upgrade to real prod number later)
 * WABA:   Mobibix (ID: 1289746016400044)
 * App:    Gympilot (App ID: 1854232595195849)
 *
 * Run: npx ts-node src/scripts/seed-system-whatsapp-number.ts
 */

import { PrismaClient } from '@prisma/client';
import { encrypt } from '../common/utils/crypto.util';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.split('#')[0].trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();  // 1043315018864898
  const wabaId = process.env.WHATSAPP_WABA_ID?.trim();                 // 1289746016400044

  if (!accessToken || !phoneNumberId || !wabaId) {
    console.error('Missing WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_WABA_ID in .env');
    process.exit(1);
  }

  const encryptedToken = encrypt(accessToken);

  const modules = ['MOBILE_SHOP', 'GYM'] as const;

  for (const moduleType of modules) {
    const result = await (prisma as any).whatsAppNumber.upsert({
      where: { phoneNumberId: `system:${moduleType}:${phoneNumberId}` },
      update: {
        accessToken: encryptedToken,
        setupStatus: 'ACTIVE',
        isEnabled: true,
        wabaId,
        updatedAt: new Date(),
      },
      create: {
        tenantId: null,
        moduleType,
        phoneNumberId: `system:${moduleType}:${phoneNumberId}`,
        phoneNumber: '15559017861',
        displayNumber: '+1 555-901-7861 (MobiBix Platform)',
        wabaId,
        accessToken: encryptedToken,
        provider: 'META_CLOUD',
        setupStatus: 'ACTIVE',
        purpose: 'DEFAULT',
        isDefault: true,
        isEnabled: true,
        isSystem: true,
        label: `MobiBix Platform Number (${moduleType})`,
      },
    });

    console.log(`✅ [${moduleType}] system number upserted: ${result.id}`);
  }

  console.log('\nDone. Platform utility notifications will now use +1 555-901-7861.');
  console.log('Note: This is a Meta test number. For production, replace with a verified number.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
