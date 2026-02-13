
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting WhatsAppLog backfill...');

  // 1. Get tenants with null whatsAppNumberId in logs
  const logsWithMissingNumber = await prisma.whatsAppLog.groupBy({
    by: ['tenantId'],
    where: {
      whatsAppNumberId: null,
    },
  });

  console.log(`Found ${logsWithMissingNumber.length} tenants with logs needing backfill.`);

  for (const group of logsWithMissingNumber) {
    const tenantId = group.tenantId;
    console.log(`Processing tenant: ${tenantId}`);

    // 2. Find a suitable WhatsApp number for this tenant
    // Priority: Default > specific number > any enabled > any
    const number = await prisma.whatsAppNumber.findFirst({
      where: { tenantId },
      orderBy: [
        { isDefault: 'desc' },
        { isEnabled: 'desc' },
        { createdAt: 'asc' },
      ],
    });

    if (!number) {
      console.warn(`⚠️  No WhatsAppNumber found for tenant ${tenantId}. Skipping logs.`);
      continue;
    }

    console.log(`   Selected number: ${number.phoneNumber} (${number.id})`);

    // 3. Update logs
    const result = await prisma.whatsAppLog.updateMany({
      where: {
        tenantId,
        whatsAppNumberId: null,
      },
      data: {
        whatsAppNumberId: number.id,
      },
    });

    console.log(`   ✅ Updated ${result.count} logs.`);
  }

  console.log('🎉 Backfill complete!');
}

main()
  .catch((e) => {
    console.error('❌ Error details:', JSON.stringify(e, null, 2));
    console.error('Stack:', e.stack);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
