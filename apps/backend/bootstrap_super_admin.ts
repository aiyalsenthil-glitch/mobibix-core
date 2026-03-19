import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    const email = 'aiyalcomputers@gmail.com';
    const user = await prisma.user.findFirst({
      where: { email }
    });

    if (!user) {
      console.log(`User ${email} not found in User table`);
      return;
    }

    console.log(`User found: ${user.id}`);

    const adminUser = await prisma.adminUser.upsert({
      where: { userId: user.id },
      update: {
        role: 'SUPER_ADMIN' as any
      },
      create: {
        userId: user.id,
        role: 'SUPER_ADMIN' as any
      }
    });

    console.log('AdminUser bootstrapped:', adminUser);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
