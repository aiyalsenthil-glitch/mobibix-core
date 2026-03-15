import { PrismaClient } from '@prisma/client';
import { runPermissionSeed } from '../src/core/permissions/permissions.seed-logic';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting Permission Sync...');
  await runPermissionSeed(prisma);
  console.log('✅ Sync complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
