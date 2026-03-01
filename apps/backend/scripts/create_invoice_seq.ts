import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRaw`CREATE SEQUENCE IF NOT EXISTS subscription_invoice_seq START 1;`;
  console.log(
    'Sequence subscription_invoice_seq verified/created successfully.',
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
