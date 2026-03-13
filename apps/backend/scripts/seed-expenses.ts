
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const shop = await prisma.shop.findFirst({
    select: { id: true, tenantId: true, name: true }
  });

  if (!shop) {
    console.error('No shop found to seed data for.');
    return;
  }

  const tenantId = shop.tenantId;
  const shopId = shop.id;

  console.log(`Seeding data for Shop: ${shop.name} (${shopId}), Tenant: ${tenantId}`);

  const categoryNames = [
    'Tea & Snacks',
    'Office Supplies',
    'Electricity Bill',
    'Travel & Transport',
    'Maintenance',
  ];

  for (const name of categoryNames) {
    // Check if category exists
    const existing = await (prisma as any).expenseCategory.findFirst({
        where: { tenantId, name }
    });

    if (!existing) {
        await (prisma as any).expenseCategory.create({
            data: {
                tenantId,
                shopId,
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

  for (const exp of expenses) {
    const voucher = await (prisma as any).paymentVoucher.create({
      data: {
        tenantId,
        shopId,
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

    // Create corresponding Financial Entry
    const financialEntryData: any = {
        tenantId,
        shopId,
        type: 'OUT',
        amount: exp.amount,
        mode: exp.method,
        referenceType: 'EXPENSE',
        referenceId: voucher.id,
        narration: exp.narration,
        createdAt: now
    };

    // Check if FinancialEntry model has extra fields or different names
    await (prisma as any).financialEntry.create({
      data: financialEntryData
    });
  }

  console.log(`Successfully seeded expenses for ${shop.name}`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
