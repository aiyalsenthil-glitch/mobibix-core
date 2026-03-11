import { PrismaClient } from '@prisma/client';
import { runPermissionSeed } from '../core/permissions/permissions.seed-logic';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting permission and role seeding (Direct Prisma)...');
  try {
    const result = await runPermissionSeed(prisma);
    console.log('✅ Seeding successful:', result);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
