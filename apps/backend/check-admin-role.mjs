import prisma from './src/core/prisma/prismaClient';

async function checkAdminRole() {
  try {
    // Find user with ADMIN role
    const adminUsers = await prisma.user.findMany({
      where: {
        OR: [{ role: 'ADMIN' }, { role: 'SUPER_ADMIN' }],
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        tenantId: true,
        REMOVED_AUTH_PROVIDERUid: true,
      },
    });

    console.log('\n=== Admin/Super Admin Users ===');
    console.log(JSON.stringify(adminUsers, null, 2));

    // Also check all users to see what roles exist
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
      },
      take: 10,
    });

    console.log('\n=== All Users (first 10) ===');
    console.log(JSON.stringify(allUsers, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdminRole();
