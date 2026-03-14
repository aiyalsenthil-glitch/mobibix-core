import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: 'test@gmail.com' },
    include: {
      userTenants: {
        include: {
          tenant: true
        }
      }
    }
  });

  if (user) {
    console.log('User found:');
    console.log(`ID: ${user.id}`);
    console.log(`Role: ${user.role}`);
    console.log('Tenants:');
    user.userTenants.forEach(ut => {
      console.log(`- Tenant: ${ut.tenant.name} (${ut.tenant.id})`);
      console.log(`  Type: ${ut.tenant.tenantType}`);
      console.log(`  Role in Tenant: ${ut.role}`);
      console.log(`  isSystemOwner: ${ut.isSystemOwner}`);
    });
  } else {
    console.log('User not found');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
