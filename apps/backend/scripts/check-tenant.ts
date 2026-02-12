import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const tenantId = process.argv[2];
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      subscription: {
        include: {
          plan: true,
          addons: { include: { addonPlan: true } }
        }
      }
    }
  });

  if (!tenant) return console.log('Tenant not found');
  
  console.log(`\nTenant: ${tenant.name} (${tenant.id})`);
  console.log(`Type: ${tenant.tenantType}, CRM Enabled: ${tenant.whatsappCrmEnabled}`);
  
  tenant.subscription.forEach(sub => {
    console.log(`\nSub ID: ${sub.id}`);
    console.log(`Module: ${sub.module}, Plan: ${sub.plan.name}, Status: ${sub.status}`);
    console.log(`Period: ${sub.startDate.toISOString()} -> ${sub.endDate.toISOString()}`);
    console.log(`Addons: ${sub.addons.map(a => a.addonPlan.name).join(', ') || 'None'}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
