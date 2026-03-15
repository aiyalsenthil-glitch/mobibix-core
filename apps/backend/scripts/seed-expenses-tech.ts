
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const shopId = 'cmmf1dbed000slevoyvirr5h4'; // Aiyal Technologies
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: { id: true, tenantId: true, name: true }
  });

  if (!shop) {
    console.error('Shop not found');
    return;
  }

  const tenantId = shop.tenantId;

  console.log(`Seeding for Shop: ${shop.name} (${shop.id}), Tenant: ${tenantId}`);

  const categoryNames = [
    'Tea & Snacks',
    'Office Supplies',
    'Electricity Bill',
    'Travel & Transport',
    'Maintenance',
  ];

  for (const name of categoryNames) {
    const existing = await (prisma as any).expenseCategory.findFirst({
        where: { tenantId, name }
    });

    if (!existing) {
        await (prisma as any).expenseCategory.create({
            data: {
                tenantId,
                shopId: shop.id,
                name,
                isDefault: true
            }
        });
    }
  }

  const seededCats = await (prisma as any).expenseCategory.findMany({
    where: { tenantId }
  });

  const expenses = [
    { category: seededCats[0], amount: 25000, narration: 'Monthly tea expenses', method: 'CASH' },
    { category: seededCats[1], amount: 150000, narration: 'Printer paper and stationery', method: 'UPI' },
    { category: seededCats[2], amount: 450000, narration: 'Feb electricity bill', method: 'BANK' },
    { category: seededCats[3], amount: 80000, narration: 'Petrol for delivery bike', method: 'CASH' },
    { category: seededCats[4], amount: 120000, narration: 'A/C Servicing', method: 'CARD' },
  ];

  const now = new Date();

  for (let i = 0; i < expenses.length; i++) {
    const exp = expenses[i];
    const voucherId = `EXP-TECH-${Math.floor(10000 + Math.random() * 90000)}-${i}`;
    
    const voucher = await (prisma as any).paymentVoucher.create({
      data: {
        tenantId,
        shopId: shop.id,
        voucherId,
        voucherType: 'EXPENSE',
        amount: exp.amount,
        paymentMethod: exp.method,
        expenseCategory: exp.category.name,
        expenseCategoryId: exp.category.id,
        narration: exp.narration,
        date: now,
        status: 'ACTIVE',
        isDeleted: false,
      }
    });

    await (prisma as any).financialEntry.create({
      data: {
        tenantId,
        shopId: shop.id,
        type: 'OUT',
        amount: exp.amount,
        mode: exp.method,
        referenceType: 'EXPENSE',
        referenceId: voucher.id,
        note: exp.narration,
        createdAt: now
      }
    });
  }

  console.log(`Successfully seeded 5 expenses for ${shop.name}`);
}

main().finally(() => prisma.$disconnect());
