import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const accounts = await prisma.ledgerAccount.findMany();
  if (accounts.length === 0) {
    console.log("No ledger accounts found.");
    return;
  }
  
  console.log(`Found ${accounts.length} ledger accounts.`);
  
  // We will delete all for now since it's test data
  console.log("Deleting all ledger test data...");
  const p1 = await prisma.ledgerPayment.deleteMany({});
  const p2 = await prisma.ledgerCollection.deleteMany({});
  const p3 = await prisma.ledgerAccount.deleteMany({});
  
  console.log(`Deleted ${p1.count} payments, ${p2.count} collections, ${p3.count} accounts.`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
