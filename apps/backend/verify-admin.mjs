import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        REMOVED_AUTH_PROVIDERUid: true,
        email: true,
        fullName: true,
        role: true,
        tenantId: true,
        createdAt: true,
      },
    });

    console.log('All Users:');
    console.log(JSON.stringify(users, null, 2));

    // Get all user-tenant relationships
    const userTenants = await prisma.userTenant.findMany({
      select: {
        id: true,
        userId: true,
        tenantId: true,
        role: true,
      },
    });

    console.log('\nAll User-Tenant Relationships:');
    console.log(JSON.stringify(userTenants, null, 2));

    // Get all tenants
    const tenants = await prisma.tenant.findMany({
      select: {
        id: true,
        name: true,
        code: true,
      },
    });

    console.log('\nAll Tenants:');
    console.log(JSON.stringify(tenants, null, 2));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
