import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testNormalizationCollision() {
  console.log('\n--- 🧪 Testing Normalization Collision ---');
  const tenant = await prisma.tenant.findFirst();
  if (!tenant) throw new Error('No tenant found');
  const tenantId = tenant.id;

  const phone1 = '9876543210';
  const phone2 = '+91 98765-43210'; // Same number, different format

  console.log(`Creating first customer with: ${phone1}`);
  const c1 = await prisma.party.create({
    data: {
      tenantId,
      name: 'Test Collide 1',
      phone: phone1,
      normalizedPhone: '+919876543210',
      countryCode: 'IN',
    },
  });
  console.log(`✅ Created C1: ${c1.id}`);

  console.log(`Attempting to create second customer with same number formatted differently: ${phone2}`);
  try {
    await prisma.party.create({
      data: {
        tenantId,
        name: 'Test Collide 2',
        phone: phone2,
        normalizedPhone: '+919876543210', // This should trigger UNIQUE constraint
        countryCode: 'IN',
      },
    });
    console.error('❌ FAIL: Duplicate normalized phone was allowed!');
  } catch (e: any) {
    if (e.code === 'P2002') {
      console.log('✅ PASS: Duplicate normalized phone correctly rejected by DB unique constraint.');
    } else {
      console.error(`❌ Unexpected error: ${e.message}`);
    }
  }

  // Cleanup
  await prisma.party.delete({ where: { id: c1.id } });
}

async function testAtomicDeadlock() {
  console.log('\n--- 🧪 Testing Atomic Deadlock (Concurrent Operations) ---');
  const firstCustomer = await prisma.party.findFirst({ where: { isActive: true } });
  
  if (!firstCustomer) {
    console.error('❌ No customer found for deadlock test');
    return;
  }

  console.log(`Using Customer: ${firstCustomer.name} (ID: ${firstCustomer.id})`);
  console.log(`Initial Outstanding: ${firstCustomer.currentOutstanding}`);

  const op1 = prisma.$transaction(async (tx) => {
    console.log('[OP1] Locking customer...');
    await tx.$queryRawUnsafe(`SELECT id FROM mb_party WHERE id = '${firstCustomer.id}' FOR UPDATE`);
    console.log('[OP1] Lock acquired. Sleeping 2s to simulate work...');
    await new Promise(r => setTimeout(r, 2000));
    await tx.party.update({
      where: { id: firstCustomer.id },
      data: { currentOutstanding: { increment: 1000 } }
    });
    console.log('[OP1] Released.');
  });

  const op2 = prisma.$transaction(async (tx) => {
    console.log('[OP2] Attempting to lock...');
    // Simple delay to ensure OP1 hits first
    await new Promise(r => setTimeout(r, 500));
    await tx.$queryRawUnsafe(`SELECT id FROM mb_party WHERE id = '${firstCustomer.id}' FOR UPDATE`);
    console.log('[OP2] Lock acquired! (Should only happen after OP1 releases)');
    await tx.party.update({
      where: { id: firstCustomer.id },
      data: { currentOutstanding: { increment: 500 } }
    });
    console.log('[OP2] Released.');
  });

  console.log('Starting OP1 and OP2 concurrently...');
  await Promise.all([op1, op2]);

  const finalCustomer = await prisma.party.findUnique({ where: { id: firstCustomer.id } });
  const expected = firstCustomer.currentOutstanding + 1500;
  
  if (finalCustomer?.currentOutstanding === expected) {
    console.log(`✅ PASS: Final outstanding is correct (${expected}). Transactions executed sequentially.`);
  } else {
    console.error(`Race condition detected! Final: ${finalCustomer?.currentOutstanding}, Expected: ${expected}`);
  }
}

async function main() {
  await testNormalizationCollision();
  await testAtomicDeadlock();
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
