import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const user = await prisma.user.findFirst({ where: { email: 'test@gmail.com' }, select: { id: true, tenantId: true, fullName: true } });
  if (!user) throw new Error('user not found');
  console.log('user:', JSON.stringify(user));
  const shop = await prisma.shop.findFirst({ where: { tenantId: user.tenantId! }, select: { id: true, name: true } });
  console.log('shop:', JSON.stringify(shop));
  const products = await prisma.shopProduct.findMany({
    where: { tenantId: user.tenantId!, shopId: shop!.id },
    select: { id: true, name: true, category: true, avgCost: true, quantity: true },
    take: 15,
  });
  console.log('products:', JSON.stringify(products, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
