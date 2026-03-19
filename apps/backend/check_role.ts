import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findFirst({
      where: { email: 'aiyalcomputers@gmail.com' }
    });

    if (!user) {
      console.log('User not found in User table');
      return;
    }

    console.log('User found:', user);

    const adminUser = await prisma.adminUser.findUnique({
      where: { userId: user.id }
    });

    if (!adminUser) {
      console.log('User not found in AdminUser table');
    } else {
      console.log('AdminUser found:', adminUser);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
