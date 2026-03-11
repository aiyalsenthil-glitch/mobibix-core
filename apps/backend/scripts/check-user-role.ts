import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkUser(email: string) {
  const user = await prisma.user.findFirst({
    where: { email },
    include: {
      shopStaffs: {
        include: {
          dynamicRole: true,
          shop: true
        }
      }
    }
  });

  if (!user) {
    console.log('User not found');
    return;
  }

  console.log(`User: ${user.email} (ID: ${user.id})`);
  console.log('Shop Staff Entries:');
  user.shopStaffs.forEach(s => {
    console.log(`- Shop: ${s.shop.name} (${s.shopId})`);
    console.log(`  Role: ${s.dynamicRole?.name || 'No Dynamic Role'} (Deleted: ${s.dynamicRole?.deletedAt || 'N/A'})`);
    console.log(`  Legacy Role: ${s.role}`);
  });
}

checkUser('staff20@gmail.com').catch(console.error);
