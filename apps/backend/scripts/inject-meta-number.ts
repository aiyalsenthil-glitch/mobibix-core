/**
 * Injects a Meta Cloud API WhatsApp number for a tenant using the app-level env credentials.
 * Used for App Review demo / temporary setup.
 *
 * Usage:
 *   cd apps/backend
 *   TENANT_ID=xxx npx ts-node -r tsconfig-paths/register scripts/inject-meta-number.ts
 *
 * Required env vars (in .env or shell):
 *   TENANT_ID, DATABASE_URL, ENCRYPTION_MASTER_KEY,
 *   WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_WABA_ID, WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER
 */

import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

// ── AES-256-GCM encrypt (mirrors crypto.util.ts) ──
function encrypt(plaintext: string): string {
  const key = process.env.ENCRYPTION_MASTER_KEY!;
  if (!key || key.length !== 64) throw new Error('ENCRYPTION_MASTER_KEY must be 64 hex chars');
  const keyBuf = Buffer.from(key, 'hex');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', keyBuf, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

async function main() {
  const tenantId         = process.env.TENANT_ID;
  const phoneNumberId    = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const wabaId           = process.env.WHATSAPP_WABA_ID;
  const accessToken      = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumber      = process.env.WHATSAPP_PHONE_NUMBER; // e.g. "919876543210"

  if (!tenantId || !phoneNumberId || !wabaId || !accessToken || !phoneNumber) {
    console.error('Missing required env vars: TENANT_ID, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_WABA_ID, WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER');
    process.exit(1);
  }

  // Verify tenant exists
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) { console.error(`Tenant ${tenantId} not found`); process.exit(1); }
  console.log(`Tenant: ${(tenant as any).businessName ?? tenant.name} (${tenantId})`);

  const encryptedToken = encrypt(accessToken);

  // Disable any existing numbers for this tenant
  const existing = await prisma.whatsAppNumber.findMany({ where: { tenantId } });
  if (existing.length > 0) {
    await prisma.whatsAppNumber.updateMany({
      where: { tenantId },
      data: { isEnabled: false, isDefault: false },
    });
    console.log(`Disabled ${existing.length} existing WhatsApp number(s)`);
  }

  // Upsert by phoneNumberId
  const record = await prisma.whatsAppNumber.upsert({
    where: { phoneNumberId },
    create: {
      tenantId,
      phoneNumberId,
      phoneNumber,
      displayNumber: `+${phoneNumber}`,
      wabaId,
      accessToken: encryptedToken,
      provider: 'META_CLOUD' as any,
      setupStatus: 'ACTIVE' as any,
      isEnabled: true,
      isDefault: true,
      label: 'Meta Cloud API',
    },
    update: {
      tenantId,
      phoneNumber,
      displayNumber: `+${phoneNumber}`,
      wabaId,
      accessToken: encryptedToken,
      provider: 'META_CLOUD' as any,
      setupStatus: 'ACTIVE' as any,
      isEnabled: true,
      isDefault: true,
    },
  });
  console.log(`WhatsApp number upserted: ${record.id}`);

  // Enable WhatsApp in tenant settings
  await prisma.whatsAppSetting.upsert({
    where: { tenantId },
    create: { tenantId, enabled: true, provider: 'META_CLOUD' },
    update: { enabled: true, provider: 'META_CLOUD' },
  });
  console.log('WhatsAppSetting enabled (META_CLOUD)');

  // Ensure whatsappCrmEnabled on tenant
  await prisma.tenant.update({
    where: { id: tenantId },
    data: { whatsappCrmEnabled: true } as any,
  });
  console.log('Tenant whatsappCrmEnabled = true');

  console.log('\n✅ Done. Meta Cloud API number injected for tenant', tenantId);
  console.log(`   Phone: +${phoneNumber}`);
  console.log(`   WABA ID: ${wabaId}`);
  console.log(`   Phone Number ID: ${phoneNumberId}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
