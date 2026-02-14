import * as dotenv from 'dotenv';

dotenv.config();

import { PrismaClient, ModuleType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required to run this script');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter } as any);

async function resolveTenantNumberId(tenantId: string) {
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

async function resolveModuleSystemNumberId(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { tenantType: true },
  });

  const moduleType = (tenant?.tenantType as ModuleType) ?? ModuleType.GYM;

  const sharedPhone = await prisma.whatsAppNumber.findFirst({
    where: {
      tenantId: null,
      moduleType,
      isEnabled: true,
      OR: [{ isDefault: true }, { purpose: 'DEFAULT' }],
    },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    select: { id: true },
  });

  return sharedPhone?.id ?? null;
}

async function backfillWhatsAppLogNumberIds() {
  const totalMissing = await prisma.whatsAppLog.count({
    where: { whatsAppNumberId: undefined },
  });

  if (totalMissing === 0) {
    console.log('✅ No WhatsAppLog records missing whatsAppNumberId.');
    return;
  }

  console.log(
    `🔍 Found ${totalMissing} WhatsAppLog rows missing whatsAppNumberId.`,
  );

  const tenants = await prisma.whatsAppLog.findMany({
    where: { whatsAppNumberId: undefined },
    select: { tenantId: true },
    distinct: ['tenantId'],
  });

  let totalUpdated = 0;
  let skippedTenants = 0;

  for (const tenant of tenants) {
    const tenantId = tenant.tenantId;
    let numberId = await resolveTenantNumberId(tenantId);

    if (!numberId) {
      numberId = await resolveModuleSystemNumberId(tenantId);
    }

    if (!numberId) {
      skippedTenants += 1;
      console.warn(
        `⚠️  No WhatsAppNumber found for tenant ${tenantId} (tenant or module). Skipping.`,
      );
      continue;
    }

    const result = await prisma.whatsAppLog.updateMany({
      where: {
        tenantId,
        whatsAppNumberId: undefined,
      },
      data: { whatsAppNumberId: numberId },
    });

    totalUpdated += result.count;
    console.log(`✅ Backfilled ${result.count} logs for tenant ${tenantId}.`);
  }

  const remaining = await prisma.whatsAppLog.count({
    where: { whatsAppNumberId: undefined },
  });

  console.log('---');
  console.log(`✅ Total updated: ${totalUpdated}`);
  console.log(`⚠️  Tenants skipped: ${skippedTenants}`);
  console.log(`🔎 Remaining missing: ${remaining}`);
}

backfillWhatsAppLogNumberIds()
  .catch((error) => {
    console.error('❌ Backfill failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
