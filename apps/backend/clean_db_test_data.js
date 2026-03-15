const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanTestData() {
  console.log('--- Cleaning Users and Tenants ---');

  // Find users that are admins
  const admins = await prisma.adminUser.findMany({ select: { userId: true } });
  const adminUserIds = admins.map(a => a.userId);

  // Delete all users except admins
  if (adminUserIds.length > 0) {
    const deletedUsers = await prisma.user.deleteMany({
      where: {
        id: { notIn: adminUserIds }
      }
    });
    console.log(`Cleared ${deletedUsers.count} non-admin Users`);
  } else {
    const deletedUsers = await prisma.user.deleteMany({});
    console.log(`Cleared ${deletedUsers.count} Users`);
  }

  // Tenant is already cleared by the previous script execution (mostly), 
  // but let's clear it completely if possible.
  const deletedTenants = await prisma.tenant.deleteMany({});
  console.log(`Cleared ${deletedTenants.count} Tenants`);

  console.log('✅ Final cleanup completed successfully.');
}

cleanTestData()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
