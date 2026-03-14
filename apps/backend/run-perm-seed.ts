
import { PrismaClient } from '@prisma/client';
import { runPermissionSeed } from './src/core/permissions/permissions.seed-logic';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting standalone permission seed...');
  await runPermissionSeed(prisma);
  console.log('Finished standalone permission seed.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
