import * as dotenv from 'dotenv';

dotenv.config();

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required to run this script');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter } as any);

async function resolveTenantReminderNumberId(tenantId: string) {
  const reminderNumber = await prisma.whatsAppNumber.findFirst({
    where: {
      tenantId,
      purpose: 'REMINDER',
      isEnabled: true,
    },
    select: { id: true },
  });

  if (reminderNumber) return reminderNumber.id;

  const defaultNumber = await prisma.whatsAppNumber.findFirst({
    where: {
      tenantId,
      isDefault: true,
      isEnabled: true,
    },
    select: { id: true },
  });

  if (defaultNumber) return defaultNumber.id;

  const enabledNumber = await prisma.whatsAppNumber.findFirst({
    where: {
      tenantId,
      isEnabled: true,
    },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    select: { id: true },
  });

  if (enabledNumber) return enabledNumber.id;

  const anyNumber = await prisma.whatsAppNumber.findFirst({
    where: { tenantId },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    select: { id: true },
  });

  return anyNumber?.id ?? null;
}

async function resolveModuleSystemReminderNumberId(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { tenantType: true },
  });

  const moduleType = tenant?.tenantType ?? 'GYM';

  const modulePhone = await prisma.whatsAppPhoneNumberModule.findFirst({
    where: {
      moduleType,
      isActive: true,
      OR: [
        { purpose: 'REMINDER' },
        { isDefault: true },
        { purpose: 'DEFAULT' },
      ],
    },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });

  if (!modulePhone) return null;

  const systemNumber = await prisma.whatsAppNumber.upsert({
    where: { phoneNumberId: modulePhone.phoneNumberId },
    update: {
      isSystem: true,
      isEnabled: true,
      phoneNumber: modulePhone.phoneNumber,
      displayNumber: modulePhone.phoneNumber,
      wabaId: modulePhone.wabaId,
      purpose: modulePhone.purpose,
      isDefault: true,
    },
    create: {
      tenantId: null,
      isSystem: true,
      isEnabled: true,
      phoneNumberId: modulePhone.phoneNumberId,
      phoneNumber: modulePhone.phoneNumber,
      displayNumber: modulePhone.phoneNumber,
      wabaId: modulePhone.wabaId,
      purpose: modulePhone.purpose,
      isDefault: true,
    },
    select: { id: true },
  });

  return systemNumber.id;
}

async function backfillTenantReminderNumbers() {
  const totalMissing = await prisma.tenant.count({
    where: { whatsappReminderNumberId: null },
  });

  if (totalMissing === 0) {
    console.log('✅ No tenants missing whatsappReminderNumberId.');
    return;
  }

  console.log(
    `🔍 Found ${totalMissing} tenants missing whatsappReminderNumberId.`,
  );

  const tenants = await prisma.tenant.findMany({
    where: { whatsappReminderNumberId: null },
    select: { id: true },
  });

  let totalUpdated = 0;
  let skippedTenants = 0;

  for (const tenant of tenants) {
    const tenantId = tenant.id;
    let numberId = await resolveTenantReminderNumberId(tenantId);

    if (!numberId) {
      numberId = await resolveModuleSystemReminderNumberId(tenantId);
    }

    if (!numberId) {
      skippedTenants += 1;
      console.warn(
        `⚠️  No WhatsAppNumber found for tenant ${tenantId} (tenant or module). Skipping.`,
      );
      continue;
    }

    await prisma.tenant.update({
      where: { id: tenantId },
      data: { whatsappReminderNumberId: numberId },
    });

    totalUpdated += 1;
    console.log(`✅ Set reminder number for tenant ${tenantId}.`);
  }

  const remaining = await prisma.tenant.count({
    where: { whatsappReminderNumberId: null },
  });

  console.log('---');
  console.log(`✅ Total updated: ${totalUpdated}`);
  console.log(`⚠️  Tenants skipped: ${skippedTenants}`);
  console.log(`🔎 Remaining missing: ${remaining}`);
}

backfillTenantReminderNumbers()
  .catch((error) => {
    console.error('❌ Backfill failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
