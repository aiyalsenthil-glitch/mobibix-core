
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function checkShop() {
  const shopId = 'cmknvruqv0003jwle69rbb7h0';
  console.log(`Checking shop: ${shopId}`);

  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: { id: true, name: true, tenantId: true, tenant: { select: { name: true, code: true } } }
  });

  console.log('Shop:', shop);

  if (shop) {
    // Check if there are other tenants
    const otherShops = await prisma.shop.findMany({
        take: 5,
        select: { id: true, name: true, tenantId: true }
    });
    console.log('Other Shops Sample:', otherShops);
  }
}

checkShop()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
