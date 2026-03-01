import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  console.log('Models available in PrismaClient:');
  console.log(
    Object.keys(prisma).filter((k) => !k.startsWith('_') && !k.startsWith('$')),
  );

  if ('partner' in prisma) {
    console.log('✅ Partner model exists on PrismaClient');
  } else {
    console.log('❌ Partner model MISSING on PrismaClient');
  }
}

check().then(() => process.exit(0));
