const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const tenantId = 'cmmq3ijhj000otvykbu1xmpu7';
const shopId   = 'cmmq3il6l0016tvyko98q9xcp';

async function seed() {
  // 1. Create serialized product
  const product = await prisma.shopProduct.upsert({
    where: { tenantId_shopId_sku: { tenantId, shopId, sku: 'TEST-IMEI-001' } },
    update: {},
    create: {
      tenantId,
      shopId,
      name: 'Samsung Galaxy S24 (Test)',
      sku: 'TEST-IMEI-001',
      type: 'GOODS',
      isSerialized: true,
      salePrice: 6999900,
      costPrice: 5999900,
      gstRate: 18,
      hsnCode: '8517',
      quantity: 0,
      isActive: true,
    },
  });
  console.log('Product:', product.id, '-', product.name);

  // 2. Seed IMEIs in every status
  const imeis = [
    // IN_STOCK - available for sale
    { imei: '358000000000001', status: 'IN_STOCK' },
    { imei: '358000000000002', status: 'IN_STOCK' },
    { imei: '358000000000003', status: 'IN_STOCK' },
    { imei: '358000000000004', status: 'IN_STOCK' },
    { imei: '358000000000005', status: 'IN_STOCK' },
    // RESERVED - held for customer
    { imei: '358000000000006', status: 'RESERVED' },
    // SOLD
    { imei: '358000000000007', status: 'SOLD',             soldAt: new Date('2026-03-10') },
    { imei: '358000000000008', status: 'SOLD',             soldAt: new Date('2026-03-12') },
    // RETURNED
    { imei: '358000000000009', status: 'RETURNED',         soldAt: new Date('2026-03-05'), returnedAt: new Date('2026-03-14') },
    // RETURNED_GOOD
    { imei: '358000000000010', status: 'RETURNED_GOOD',    soldAt: new Date('2026-03-01'), returnedAt: new Date('2026-03-13') },
    // RETURNED_DAMAGED
    { imei: '358000000000011', status: 'RETURNED_DAMAGED', soldAt: new Date('2026-02-20'), returnedAt: new Date('2026-03-10'), damageNotes: 'Screen cracked on return' },
    // DAMAGED
    { imei: '358000000000012', status: 'DAMAGED',          damageNotes: 'Dropped in warehouse' },
    // LOST
    { imei: '358000000000013', status: 'LOST',             lostReason: 'Missing after stock audit' },
    // SCRAPPED
    { imei: '358000000000014', status: 'SCRAPPED' },
    // TRANSFERRED (transferredToShopId set)
    { imei: '358000000000015', status: 'IN_STOCK',         transferredToShopId: shopId },
  ];

  let created = 0;
  for (const item of imeis) {
    try {
      await prisma.iMEI.upsert({
        where: { tenantId_imei: { tenantId, imei: item.imei } },
        update: {},
        create: {
          tenantId,
          shopProductId: product.id,
          imei: item.imei,
          status: item.status,
          soldAt: item.soldAt || null,
          returnedAt: item.returnedAt || null,
          damageNotes: item.damageNotes || null,
          lostReason: item.lostReason || null,
          transferredToShopId: item.transferredToShopId || null,
        },
      });
      created++;
      console.log(' +', item.imei, '-', item.status);
    } catch (e) {
      console.error(' SKIP', item.imei, e.message);
    }
  }

  // Update product quantity to reflect IN_STOCK count
  const inStock = await prisma.iMEI.count({
    where: { tenantId, shopProductId: product.id, status: 'IN_STOCK' },
  });
  await prisma.shopProduct.update({
    where: { id: product.id },
    data: { quantity: inStock },
  });

  console.log('\nSummary:');
  console.log('  IMEIs seeded:', created, '/ 15');
  console.log('  IN_STOCK qty:', inStock);
  console.log('\nTest steps:');
  console.log('  1. Login as test@gmail.com');
  console.log('  2. Go to Inventory → IMEI Tracker');
  console.log('  3. Filter by status, update/transfer/reserve IMEIs');
  console.log('  4. Go to Sales → Create Invoice, scan IMEI 358000000000001');
}

seed()
  .then(() => prisma.$disconnect())
  .catch((e) => { console.error(e); prisma.$disconnect(); });
