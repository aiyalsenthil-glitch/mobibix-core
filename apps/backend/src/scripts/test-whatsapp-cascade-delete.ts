import * as dotenv from 'dotenv';

dotenv.config();

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { randomUUID } from 'crypto';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required to run this script');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter } as any);

async function testCascadeDelete() {
  const tenant = await prisma.tenant.findFirst({
    select: { id: true },
  });

  if (!tenant) {
    throw new Error('No tenant found to run cascade test.');
  }

  const phoneNumberId = `test-${randomUUID()}`;
  const messageId = `test-${randomUUID()}`;

  let result: {
    deleteResult: 'success' | 'failed';
    errorMessage?: string;
    logCountBefore?: number;
    logCountAfter?: number;
  } | null = null;

  const number = await prisma.whatsAppNumber.create({
    data: {
      tenantId: null,
      isSystem: true,
      isEnabled: true,
      phoneNumberId,
      phoneNumber: '910000000000',
      displayNumber: '910000000000',
      wabaId: 'test-waba',
      purpose: 'DEFAULT',
      isDefault: false,
    },
    select: { id: true },
  });

  try {
    await prisma.whatsAppLog.create({
      data: {
        tenantId: tenant.id,
        phone: '910000000000',
        type: 'TEST',
        status: 'SENT',
        messageId,
        whatsAppNumberId: number.id,
      },
    });

    const logCountBefore = await prisma.whatsAppLog.count({
      where: { whatsAppNumberId: number.id },
    });

    try {
      await prisma.whatsAppNumber.delete({ where: { id: number.id } });
      const logCountAfter = await prisma.whatsAppLog.count({
        where: { whatsAppNumberId: number.id },
      });

      result = {
        deleteResult: 'success',
        logCountBefore,
        logCountAfter,
      };
    } catch (error) {
      result = {
        deleteResult: 'failed',
        errorMessage: error instanceof Error ? error.message : String(error),
        logCountBefore,
      };
    }
  } finally {
    await prisma.whatsAppLog.deleteMany({
      where: { messageId },
    });
    await prisma.whatsAppNumber.deleteMany({
      where: { phoneNumberId },
    });
  }

  if (!result) {
    throw new Error('Cascade test did not produce a result.');
  }

  return result;
}

async function main() {
  const result = await testCascadeDelete();

  console.log('--- WhatsAppNumber Cascade Delete Test ---');
  console.log(`Delete result: ${result.deleteResult}`);
  if (result.logCountBefore !== undefined) {
    console.log(`Logs before delete: ${result.logCountBefore}`);
  }
  if (result.logCountAfter !== undefined) {
    console.log(`Logs after delete: ${result.logCountAfter}`);
  }
  if (result.errorMessage) {
    console.log(`Delete error: ${result.errorMessage}`);
  }
  console.log('Note: Test data was cleaned up after the run.');
}

main()
  .catch((error) => {
    console.error('❌ Cascade test failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
