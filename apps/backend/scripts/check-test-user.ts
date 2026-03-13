import { PrismaClient, UserRole } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const email = 'test@gmail.com';
  const user = await prisma.user.findFirst({
    where: { email },
    include: {
      userTenants: true,
    }
  });

  if (!user) {
    console.log(`User ${email} not found`);
    return;
  }

  console.log(`User: ${user.email}, Global Role: ${user.role}`);
  console.log('Tenants:');
  user.userTenants.forEach(ut => {
    console.log(`- TenantId: ${ut.tenantId}, isSystemOwner: ${ut.isSystemOwner}, Role: ${ut.role}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
