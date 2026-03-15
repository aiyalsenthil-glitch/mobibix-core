const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// Manually parse .env
const envPath = path.join(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim().replace(/^"(.*)"$/, '$1');
  }
});

process.env.DATABASE_URL = envVars.DATABASE_URL;

const prisma = new PrismaClient();

async function main() {
  const tenantId = process.argv[2] || 'cmletvi280000okle8frjy21j';
  console.log(`Checking Tenant: ${tenantId}\n`);

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

  console.log('Tenant Type:', tenant.tenantType);
  console.log('WhatsApp CRM Enabled:', tenant.whatsappCrmEnabled);

  tenant.subscription.forEach(sub => {
    console.log(`\nSubscription: ${sub.id}`);
    console.log(`  Module: ${sub.module}`);
    console.log(`  Plan: ${sub.plan.name} (${sub.plan.code})`);
    console.log(`  Status: ${sub.status}`);
    console.log(`  Dates: ${sub.startDate.toISOString()} -> ${sub.endDate.toISOString()}`);
    
    sub.addons.forEach(addon => {
      console.log(`  Addon: ${addon.addonPlan.name} (${addon.addonPlan.code}) [${addon.status}]`);
    });
  });

  // Also check ALL WHATSAPP_CRM subscriptions for this tenant just in case they aren't linked to the tenant.subscription relation correctly
  const crmSubs = await prisma.tenantSubscription.findMany({
    where: { tenantId, module: 'WHATSAPP_CRM' },
    include: { plan: true }
  });
  
  if (crmSubs.length > 0) {
    console.log('\nDirect Standalone CRM Subscriptions Found:');
    crmSubs.forEach(s => console.log(`- ${s.plan.name} [${s.status}]`));
  } else {
    console.log('\nNo Direct Standalone CRM Subscriptions Found.');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
