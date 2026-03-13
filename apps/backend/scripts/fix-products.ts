import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PRODUCT_CATALOG: Record<string, { category: string; avgCost: number }> = {
  'iPhone 15 Pro Max':        { category: 'Smartphones',       avgCost: 12000000 },
  'Samsung Galaxy S24 Ultra': { category: 'Smartphones',       avgCost: 9500000  },
  'Redmi Note 13 Pro':        { category: 'Smartphones',       avgCost: 2200000  },
  'Realme 12 Pro+':           { category: 'Smartphones',       avgCost: 3100000  },
  'iPhone 15 Screen (OEM)':   { category: 'Spare Parts',       avgCost: 450000   },
  'Samsung Battery EB-BA505': { category: 'Spare Parts',       avgCost: 120000   },
  'iPhone Charging Port':     { category: 'Spare Parts',       avgCost: 85000    },
  'AirPods Pro (Clone)':      { category: 'Audio & Earphones', avgCost: 250000   },
  'boAt Airdopes 141':        { category: 'Audio & Earphones', avgCost: 120000   },
  'Mi True Wireless 2C':      { category: 'Audio & Earphones', avgCost: 140000   },
  'Anker 65W GaN Charger':    { category: 'Chargers & Cables', avgCost: 180000   },
  'Type-C Braided Cable 2m':  { category: 'Chargers & Cables', avgCost: 35000    },
  'iPhone 15 Clear Case':     { category: 'Cases & Covers',    avgCost: 45000    },
  'Tempered Glass Pack (10)': { category: 'Accessories',       avgCost: 15000    },
  'Pop Socket Grip':          { category: 'Accessories',       avgCost: 8000     },
};

// For any product not in our catalog, use these fallback categories by index
const FALLBACK: Array<{ category: string; avgCost: number }> = [
  { category: 'Smartphones',       avgCost: 2500000 },
  { category: 'Spare Parts',       avgCost: 150000  },
  { category: 'Accessories',       avgCost: 25000   },
  { category: 'Audio & Earphones', avgCost: 180000  },
  { category: 'Chargers & Cables', avgCost: 45000   },
  { category: 'Cases & Covers',    avgCost: 35000   },
];

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: 'test@gmail.com' },
    select: { id: true, tenantId: true },
  });
  if (!user?.tenantId) throw new Error('User not found');

  const shop = await prisma.shop.findFirst({
    where: { tenantId: user.tenantId },
    select: { id: true },
  });
  if (!shop) throw new Error('No shop found');

  const products = await prisma.shopProduct.findMany({
    where: { tenantId: user.tenantId, shopId: shop.id },
    select: { id: true, name: true },
  });

  let updated = 0;
  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const catalog = PRODUCT_CATALOG[p.name];
    const data = catalog ?? FALLBACK[i % FALLBACK.length];

    await prisma.shopProduct.update({
      where: { id: p.id },
      data: { category: data.category, avgCost: data.avgCost },
    });
    console.log(`  ✓ ${p.name} → ${data.category} @ ₹${(data.avgCost / 100).toLocaleString('en-IN')}`);
    updated++;
  }

  console.log(`\n✅ Updated ${updated} products`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
