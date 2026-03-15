import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Real mobile shop products with categories & costs (avgCost in Paisa)
const PRODUCT_DATA = [
  { name: 'iPhone 15 Pro Max',        category: 'Smartphones',       avgCost: 12000000 }, // ₹1,20,000
  { name: 'Samsung Galaxy S24 Ultra', category: 'Smartphones',       avgCost: 9500000  }, // ₹95,000
  { name: 'Redmi Note 13 Pro',        category: 'Smartphones',       avgCost: 2200000  }, // ₹22,000
  { name: 'iPhone 15 Screen (OEM)',   category: 'Spare Parts',       avgCost: 450000   }, // ₹4,500
  { name: 'Samsung Battery EB-BA505', category: 'Spare Parts',       avgCost: 120000   }, // ₹1,200
  { name: 'iPhone Charging Port',     category: 'Spare Parts',       avgCost: 85000    }, // ₹850
  { name: 'AirPods Pro (Clone)',      category: 'Audio & Earphones', avgCost: 250000   }, // ₹2,500
  { name: 'boAt Airdopes 141',        category: 'Audio & Earphones', avgCost: 120000   }, // ₹1,200
  { name: 'Anker 65W GaN Charger',    category: 'Chargers & Cables', avgCost: 180000   }, // ₹1,800
  { name: 'Type-C Braided Cable 2m',  category: 'Chargers & Cables', avgCost: 35000    }, // ₹350
  { name: 'iPhone 15 Clear Case',     category: 'Cases & Covers',    avgCost: 45000    }, // ₹450
  { name: 'Tempered Glass Pack (10)', category: 'Accessories',       avgCost: 15000    }, // ₹150
  { name: 'Pop Socket Grip',          category: 'Accessories',       avgCost: 8000     }, // ₹80
  { name: 'Mi True Wireless 2C',      category: 'Audio & Earphones', avgCost: 140000   }, // ₹1,400
  { name: 'Realme 12 Pro+',           category: 'Smartphones',       avgCost: 3100000  }, // ₹31,000
];

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: 'test@gmail.com' },
    select: { id: true, tenantId: true },
  });
  if (!user?.tenantId) throw new Error('User test@gmail.com not found');

  const tenantId = user.tenantId;
  const userId   = user.id;

  const shop = await prisma.shop.findFirst({
    where: { tenantId },
    select: { id: true },
  });
  if (!shop) throw new Error('No shop found');
  const shopId = shop.id;

  // 1. Update user fullName
  await prisma.user.update({
    where: { id: userId },
    data: { fullName: 'Arjun Mehta' },
  });
  console.log('✓ Updated user fullName → Arjun Mehta');

  // 2. Fetch existing products and patch with real data
  const products = await prisma.shopProduct.findMany({
    where: { tenantId, shopId },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
    take: 15,
  });

  for (let i = 0; i < products.length && i < PRODUCT_DATA.length; i++) {
    const pd = PRODUCT_DATA[i];
    await prisma.shopProduct.update({
      where: { id: products[i].id },
      data: { name: pd.name, category: pd.category, avgCost: pd.avgCost },
    });
  }
  console.log(`✓ Updated ${Math.min(products.length, PRODUCT_DATA.length)} products with real names/categories/costs`);

  // 3. Delete old seed sessions (all confirmed verifications for this shop)
  const deleted = await prisma.stockVerification.deleteMany({
    where: { tenantId, shopId, status: 'CONFIRMED' },
  });
  console.log(`✓ Deleted ${deleted.count} old verification sessions`);

  // 4. Re-fetch updated products
  const updatedProducts = await prisma.shopProduct.findMany({
    where: { tenantId, shopId },
    select: { id: true, name: true, category: true, avgCost: true },
    orderBy: { createdAt: 'asc' },
    take: 15,
  });

  // 5. Create diverse sessions spread over last 90 days
  // Each session: different products, reasons, loss quantities
  const sessions: Array<{
    daysAgo: number;
    items: Array<{ idx: number; lossQty: number; reason: string }>;
  }> = [
    {
      daysAgo: 3,
      items: [
        { idx: 3, lossQty: 1, reason: 'DAMAGE'      }, // iPhone screen damaged
        { idx: 10, lossQty: 3, reason: 'BREAKAGE'   }, // cases broken
        { idx: 11, lossQty: 5, reason: 'BREAKAGE'   }, // tempered glass broken
      ],
    },
    {
      daysAgo: 12,
      items: [
        { idx: 4,  lossQty: 2, reason: 'SPARE_DAMAGE' }, // Samsung battery damaged
        { idx: 5,  lossQty: 1, reason: 'SPARE_DAMAGE' }, // charging port damaged
        { idx: 9,  lossQty: 4, reason: 'LOST'          }, // cables missing
      ],
    },
    {
      daysAgo: 22,
      items: [
        { idx: 0,  lossQty: 1, reason: 'DAMAGE'      }, // iPhone stolen/missing
        { idx: 6,  lossQty: 2, reason: 'BREAKAGE'    }, // AirPods clone broken
        { idx: 12, lossQty: 6, reason: 'INTERNAL_USE'}, // pop sockets used internally
      ],
    },
    {
      daysAgo: 38,
      items: [
        { idx: 1,  lossQty: 1, reason: 'DAMAGE'      }, // Samsung damaged in demo
        { idx: 7,  lossQty: 1, reason: 'BREAKAGE'    }, // boAt earphones broken
        { idx: 8,  lossQty: 2, reason: 'LOST'         }, // chargers missing
        { idx: 11, lossQty: 8, reason: 'CORRECTION'  }, // stock count correction
      ],
    },
    {
      daysAgo: 55,
      items: [
        { idx: 2,  lossQty: 1, reason: 'DAMAGE'      }, // Redmi damaged
        { idx: 3,  lossQty: 2, reason: 'SPARE_DAMAGE'}, // more screens
        { idx: 13, lossQty: 1, reason: 'LOST'         }, // Mi earphones lost
      ],
    },
    {
      daysAgo: 72,
      items: [
        { idx: 14, lossQty: 1, reason: 'DAMAGE'      }, // Realme demo damaged
        { idx: 4,  lossQty: 3, reason: 'BREAKAGE'    }, // batteries broken
        { idx: 9,  lossQty: 5, reason: 'CORRECTION'  }, // cables count corrected
        { idx: 10, lossQty: 2, reason: 'INTERNAL_USE'}, // cases used internally
      ],
    },
  ];

  for (const s of sessions) {
    const sessionDate = new Date();
    sessionDate.setDate(sessionDate.getDate() - s.daysAgo);

    const itemsData = s.items
      .filter(i => updatedProducts[i.idx])
      .map(i => {
        const p = updatedProducts[i.idx];
        return {
          tenantId,
          shopId,
          shopProductId: p.id,
          systemQty:     100,
          physicalQty:   100 - i.lossQty,
          difference:    -i.lossQty,
          reason:        i.reason as any,
        };
      });

    const session = await prisma.stockVerification.create({
      data: {
        tenantId,
        shopId,
        sessionDate,
        status:      'CONFIRMED',
        createdBy:   userId,
        confirmedBy: userId,
        confirmedAt: new Date(),
        notes:       `Seed session (${s.daysAgo}d ago)`,
        items:       { create: itemsData },
      },
    });

    const totalLoss = itemsData.reduce((sum, i) => {
      const p = updatedProducts.find(x => x.id === i.shopProductId);
      return sum + Math.abs(i.difference) * ((p?.avgCost ?? 0) / 100);
    }, 0);

    console.log(`✓ Session ${s.daysAgo}d ago — ${itemsData.length} items — ₹${totalLoss.toFixed(0)} loss`);
  }

  console.log('\n✅ Shrinkage seed data ready — navigate to /tools/shrinkage');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
