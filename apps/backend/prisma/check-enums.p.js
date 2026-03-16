const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const enums = await prisma.$queryRaw`SELECT t.typname as enum_name FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid GROUP BY t.typname`;
  console.log(JSON.stringify(enums, null, 2));
  await prisma.$disconnect();
}
main();
