
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  const email = 'aiyalcomputers@gmail.com';

  console.log(`🚀 Promoting user to SUPER_ADMIN: ${email}`);
  
  try {
    // 1. Find the user
    const user = await prisma.user.findFirst({
      where: { email }
    });

    if (!user) {
      console.log('❌ User not found. Please log in once to create the user record or check the email.');
      process.exit(1);
    }

    console.log(`✅ Found user: ${user.id} (Current Platform Role: ${user.role})`);

    // 2. Ensure user has ADMIN/SUPER_ADMIN role in User table
    await prisma.user.update({
      where: { id: user.id },
      data: { role: 'SUPER_ADMIN' }
    });
    console.log('✅ Updated User.role to SUPER_ADMIN');

    // 3. Create or Update AdminUser record
    const adminUser = await prisma.adminUser.upsert({
      where: { userId: user.id },
      update: { role: 'SUPER_ADMIN' },
      create: {
        userId: user.id,
        role: 'SUPER_ADMIN'
      }
    });

    console.log('✅ Upserted AdminUser record:', adminUser);
    console.log('\n✨ Done! Please refresh the admin dashboard.');

  } catch (error) {
    console.error('❌ Error during promotion:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
