
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const vouchers = await prisma.paymentVoucher.findMany({
    where: { voucherType: 'EXPENSE' },
    select: {
      id: true,
      voucherId: true,
      shopId: true,
      tenantId: true,
      expenseCategory: true,
      amount: true,
      date: true,
      isDeleted: true,
      status: true
    }
  });

  console.log('--- EXPENSE VOUCHERS ---');
  console.dir(vouchers, { depth: null });

  const shops = await prisma.shop.findMany({
    select: { id: true, name: true }
  });
  console.log('--- SHOPS ---');
  console.dir(shops, { depth: null });
}

main().finally(() => prisma.$disconnect());
