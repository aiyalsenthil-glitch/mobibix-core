
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
} as any);

async function main() {
  console.log('Searching for products with name containing "Vivo"...');
  const products = await prisma.shopProduct.findMany({
    where: {
      name: {
        contains: 'Vivo',
        mode: 'insensitive'
      }
    },
    select: {
      id: true,
      name: true,
      type: true,
      tenantId: true,
      shopId: true,
      createdAt: true
    }
  });

  console.log(`Found ${products.length} products:`);
  products.forEach(p => console.log(JSON.stringify(p, null, 2)));
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
