
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenantId = 'cm1lwr3e30003v4lehu8sbd5b';
  
  console.log('--- Inspecting Tenant ---');
  try {
    // Raw query to see all columns, even those not in schema.prisma
    const tenants: any[] = await prisma.$queryRaw`SELECT * FROM "Tenant" WHERE id = ${tenantId} LIMIT 1`;
    if (tenants.length > 0) {
      console.log('Tenant Found:', tenants[0]);
      if ('plan' in tenants[0]) {
        console.log('✅ Found "plan" column in DB:', tenants[0].plan);
      } else {
        console.log('❌ No "plan" column in DB Tenant table');
      }
    } else {
      console.log('Tenant not found');
    }
  } catch (e) {
    console.error('Error querying Tenant:', e);
  }

  console.log('\n--- Inspecting Subscriptions ---');
  const subs = await prisma.tenantSubscription.findMany({ 
    where: { tenantId },
    include: { plan: true }
  });
  console.log(JSON.stringify(subs, null, 2));

  console.log('\n--- Available Plans ---');
  const plans = await prisma.plan.findMany();
  console.log(plans.map((p: any) => ({ id: p.id, code: p.code, name: p.name, isActive: p.isActive })));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
