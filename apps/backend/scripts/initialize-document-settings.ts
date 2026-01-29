/**
 * Migration Script: Initialize Document Numbering for Existing Shops
 *
 * Run this after applying the document_numbering_system migration
 * to seed settings for shops created before the new system.
 *
 * Usage:
 * ```bash
 * ts-node scripts/initialize-document-settings.ts
 * ```
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Initializing document numbering settings...\n');

  // Fetch all shops
  const shops = await prisma.shop.findMany({
    select: {
      id: true,
      name: true,
      invoicePrefix: true,
    },
  });

  console.log(`Found ${shops.length} shops\n`);

  let initialized = 0;
  let skipped = 0;

  for (const shop of shops) {
    console.log(`Processing: ${shop.name} (${shop.invoicePrefix})`);

    try {
      // Check if settings already exist
      const existing = await prisma.shopDocumentSetting.findFirst({
        where: { shopId: shop.id },
      });

      if (existing) {
        console.log(`  ⏭️  Skipped (already initialized)\n`);
        skipped++;
        continue;
      }

      // Create default settings
      const defaultSettings = [
        {
          shopId: shop.id,
          documentType: 'SALES_INVOICE',
          prefix: shop.invoicePrefix,
          separator: '-',
          documentCode: 'S',
          yearFormat: 'FY',
          numberLength: 4,
          resetPolicy: 'YEARLY',
        },
        {
          shopId: shop.id,
          documentType: 'PURCHASE_INVOICE',
          prefix: shop.invoicePrefix,
          separator: '-',
          documentCode: 'P',
          yearFormat: 'FY',
          numberLength: 4,
          resetPolicy: 'YEARLY',
        },
        {
          shopId: shop.id,
          documentType: 'JOB_CARD',
          prefix: shop.invoicePrefix,
          separator: '-',
          documentCode: 'J',
          yearFormat: 'FY',
          numberLength: 4,
          resetPolicy: 'YEARLY',
        },
        {
          shopId: shop.id,
          documentType: 'RECEIPT',
          prefix: shop.invoicePrefix,
          separator: '-',
          documentCode: 'R',
          yearFormat: 'FY',
          numberLength: 4,
          resetPolicy: 'YEARLY',
        },
        {
          shopId: shop.id,
          documentType: 'QUOTATION',
          prefix: shop.invoicePrefix,
          separator: '-',
          documentCode: 'Q',
          yearFormat: 'FY',
          numberLength: 4,
          resetPolicy: 'YEARLY',
        },
        {
          shopId: shop.id,
          documentType: 'PURCHASE_ORDER',
          prefix: shop.invoicePrefix,
          separator: '-',
          documentCode: 'PO',
          yearFormat: 'FY',
          numberLength: 4,
          resetPolicy: 'YEARLY',
        },
      ];

      await prisma.shopDocumentSetting.createMany({
        data: defaultSettings as any,
      });

      console.log(`  ✅ Initialized 6 document types\n`);
      initialized++;
    } catch (error) {
      console.error(`  ❌ Error: ${error.message}\n`);
    }
  }

  console.log('─'.repeat(50));
  console.log(`✅ Initialized: ${initialized} shops`);
  console.log(`⏭️  Skipped: ${skipped} shops`);
  console.log(`📊 Total: ${shops.length} shops`);
  console.log('─'.repeat(50));
}

main()
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
