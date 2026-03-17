
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const tenantId = 'cmmq3ijhj000otvykbu1xmpu7';
  const email = 'test@gmail.com';
  
  const user = await prisma.user.findFirst({
    where: { email },
    include: {
      userTenants: {
        where: { tenantId }
      }
    }
  });
  
  console.log('User:', {
    id: user?.id,
    email: user?.email,
    role: user?.role,
    tenantId: user?.tenantId,
    tenancy: user?.userTenants
  });
}

check().catch(console.error).finally(() => prisma.$disconnect());
